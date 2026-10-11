"""One plate per labeled image benchmark. Negative images are empty strings."""
import math


def edit_distance(a, b):
    row = list(range(len(b)+1))
    for i, x in enumerate(a, 1):
        new = [i]
        for j, y in enumerate(b, 1):
            new.append(min(new[-1]+1, row[j]+1, row[j-1]+(x != y)))
        row = new
    return row[-1]


def summarize(rows):
    if not rows:
        raise ValueError("Cannot report metrics for an empty dataset")
    tp = fp = fn = exact = edits = chars = 0
    latency = []
    for row in rows:
        truth, pred = row["expected"], row["predicted"]
        ms = float(row["latency_ms"])
        if not math.isfinite(ms) or ms < 0:
            raise ValueError("Invalid measured latency")
        latency.append(ms)
        ambiguous = bool(row.get("ambiguous", False))
        correct = truth == pred and not ambiguous
        exact += correct
        tp += bool(truth) and correct
        fp += (bool(pred) or ambiguous) and not correct
        fn += bool(truth) and not correct
        if truth:
            edits += edit_distance(truth, pred)
            chars += len(truth)
    latency.sort()
    return {"samples": len(rows), "exact_match_accuracy": exact/len(rows),
            "plate_precision": tp/(tp+fp) if tp+fp else None,
            "plate_recall": tp/(tp+fn) if tp+fn else None,
            "character_error_rate": edits/chars if chars else None,
            "false_positive_images": fp, "false_negative_images": fn,
            "latency_ms_p50": latency[math.ceil(len(latency)*.5)-1],
            "latency_ms_p95": latency[math.ceil(len(latency)*.95)-1]}
