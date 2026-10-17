"""Fair bounded multi-camera scheduling with one shared inference pipeline."""
from dataclasses import fields
import math
from queue import Empty
import time

from .camera import CameraConfig, CameraWorker
from .core import Decision
from .store import EventStore
from .tracking import Region, TrackedConsensus


def observe_cameras(pipeline, cameras, seconds, database, emit, *,
                    worker_factory=CameraWorker,clock=time.monotonic,sleep=time.sleep):
    if not 1<=len(cameras)<=16 or len({c['id'] for c in cameras})!=len(cameras):
        raise ValueError('Use 1..16 unique camera identities')
    if not math.isfinite(seconds) or not 0<seconds<=86400:
        raise ValueError('Invalid observation duration')
    states=[]
    for camera in cameras:
        tracker=TrackedConsensus(camera['id'],region=Region(*camera.get('roi',[0,0,1,1])))
        worker=worker_factory(CameraConfig(camera['source'],camera_id=camera['id'],transport=camera.get('transport','tcp')))
        states.append({'worker':worker,'tracker':tracker,'status':None,'reconnects':0,'processed':0})
    store=EventStore(database)
    started=[]
    decision_fields={f.name for f in fields(Decision)}
    timed_out=False
    try:
        for state in states:
            state['worker'].start()
            started.append(state)
        deadline=clock()+seconds
        while clock()<deadline:
            worked=False
            # One frame per camera per round; capture queues retain only latest frames.
            for state in states:
                if clock()>=deadline:break
                worker,tracker=state['worker'],state['tracker']
                if worker.status!=state['status']:
                    emit({'camera':tracker.camera,'status':worker.status})
                    state['status']=worker.status
                if worker.reconnects!=state['reconnects']:
                    tracker.reset()
                    state['reconnects']=worker.reconnects
                try:frame=worker.frames.get_nowait()
                except Empty:continue
                worked=True
                if not 0<=clock()-frame.captured_at<=tracker.engine.max_age:
                    tracker.reset()
                    emit({'camera':tracker.camera,'status':'stale_frame_dropped'})
                    continue
                predictions,latency=pipeline.analyze(frame.image)
                # Inference may overlap a reconnect; discard that frame's evidence.
                if worker.reconnects!=state['reconnects']:
                    tracker.reset()
                    state['reconnects']=worker.reconnects
                    continue
                decisions=tracker.observe(predictions,frame.sequence,frame.captured_at,clock(),
                                          frame.image.shape[1],frame.image.shape[0])
                for decision in decisions:
                    store.append(Decision(**{k:v for k,v in decision.items() if k in decision_fields}))
                state['processed']+=1
                emit({'source':'live_rtsp','camera':tracker.camera,'decisions':decisions,
                      'inference_ms':latency,'capture_to_decision_ms':(clock()-frame.captured_at)*1000,
                      'dropped_frames':worker.dropped,'reconnects':worker.reconnects,
                      'processed_frames':state['processed']})
            if not worked:sleep(.01)
    except KeyboardInterrupt:
        pass
    finally:
        for state in started:state['worker'].stop()
        for state in started:
            state['worker'].join(timeout=7)
            if state['worker'].is_alive():timed_out=True
        store.close()
    emit({'status':'capture_shutdown_timeout' if timed_out else 'observation_finished',
          'cameras':len(states),'processed_frames':sum(s['processed'] for s in states),'barrier_commands':0})
    return 2 if timed_out else 0
