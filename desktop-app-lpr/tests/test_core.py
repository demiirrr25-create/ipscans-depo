import math
import unittest
from lpr.core import Consensus, Reading, valid_tr_plate, normalize_plate
from lpr.store import EventStore
from lpr.metrics import summarize, edit_distance


class CoreTests(unittest.TestCase):
    def test_civilian_plate_subset(self):
        for plate in ("34 ABC 123","06-AB-1234","01A12345","81ZZ999"):
            self.assertTrue(valid_tr_plate(plate),plate)
        for plate in ("00AA123","82AA123","34A12","34ABC12345","34AB12!","٣٤AB123"):
            self.assertFalse(valid_tr_plate(plate),plate)
        self.assertEqual(normalize_plate("34 AOB 123"),"34AOB123")

    def test_three_distinct_frames_and_dedup(self):
        engine = Consensus()
        statuses = [engine.observe(Reading("a",i,i*.1,"34ABC123",.95),i*.1).status for i in range(4)]
        self.assertEqual(statuses,["pending","pending","recognized","suppressed"])

    def test_duplicate_stale_future_and_nonfinite(self):
        engine = Consensus()
        r = Reading("a",1,1,"34ABC123",.99)
        engine.observe(r,1)
        self.assertEqual(engine.observe(r,1).reason,"duplicate_or_reordered_frame")
        self.assertEqual(engine.observe(r,4).status,"rejected")
        self.assertEqual(engine.observe(r,0).status,"rejected")
        for value in (math.nan, math.inf,-.1,1.1):
            with self.assertRaises(ValueError):
                Reading("a",1,1,"34ABC123",value)

    def test_low_confidence_and_invalid_never_recognized(self):
        engine = Consensus()
        for i in range(10):
            self.assertEqual(engine.observe(Reading("a",i,i*.1,"34ABC123",.5),i*.1).status,"review")
        self.assertEqual(engine.observe(Reading("a",11,1.1,"99XX123",.99),1.1).status,"review")

    def test_camera_isolation_and_window(self):
        engine = Consensus()
        for i in range(2):
            self.assertEqual(engine.observe(Reading("a",i,i*.1,"34ABC123",.99),i*.1).status,"pending")
        self.assertEqual(engine.observe(Reading("b",2,.2,"34ABC123",.99),.2).status,"pending")
        self.assertEqual(engine.observe(Reading("a",3,5,"34ABC123",.99),5).status,"pending")

    def test_conflicting_readings_abstain(self):
        engine = Consensus()
        for i,text in enumerate(["34ABC123","34ABC123","34ABC128","34ABC128","34ABC123"]):
            self.assertNotEqual(engine.observe(Reading("a",i,i*.1,text,.99),i*.1).status,"recognized")

    def test_capacity_and_ttl(self):
        engine = Consensus(max_tracks=1)
        engine.observe(Reading("a",1,0,"34ABC123",.99),0)
        self.assertEqual(engine.observe(Reading("b",1,.1,"34ABC123",.99),.1).reason,"track_capacity")
        self.assertEqual(engine.observe(Reading("b",2,3,"34ABC123",.99),3).status,"pending")

    def test_storage_filters_and_retention(self):
        store = EventStore(":memory:")
        engine = Consensus(min_frames=1)
        store.append(engine.observe(Reading("a",1,0,"34ABC123",.99),0),timestamp=100)
        store.append(engine.observe(Reading("b",1,0,"06AB1234",.4),0),timestamp=200)
        self.assertEqual(len(store.search(camera="a")),1)
        self.assertEqual(len(store.search(plate="' OR 1=1 --")),0)
        self.assertEqual(len(store.search(since=150)),1)
        self.assertEqual(store.purge(150),1)
        self.assertEqual(len(store.search()),1)
        self.assertEqual(engine.observe(Reading("x",1,0,"34ABC123",.99),0).barrier_result,"not_requested")
        store.close()

    def test_metrics_include_misreads_and_negatives(self):
        rows = [{"expected":a,"predicted":b,"latency_ms":n} for n,(a,b) in enumerate([
            ("ABC","ABC"),("ABC","ABD"),("ABC",""),("","ABC"),("","")])]
        metrics = summarize(rows)
        self.assertAlmostEqual(metrics["plate_precision"],1/3)
        self.assertAlmostEqual(metrics["plate_recall"],1/3)
        self.assertEqual(metrics["exact_match_accuracy"],.4)
        self.assertAlmostEqual(metrics["character_error_rate"],4/9)
        self.assertEqual(edit_distance("kitten","sitting"),3)
        with self.assertRaises(ValueError):
            summarize([])

    def test_ambiguous_negative_is_not_a_true_negative(self):
        metrics = summarize([{"expected":"","predicted":"","ambiguous":True,"latency_ms":1}])
        self.assertEqual(metrics["false_positive_images"],1)
        self.assertEqual(metrics["exact_match_accuracy"],0)
        self.assertEqual(metrics["plate_precision"],0)
        self.assertIsNone(metrics["plate_recall"])


if __name__ == "__main__":
    unittest.main()
