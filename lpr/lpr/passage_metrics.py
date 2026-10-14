"""One-to-one directional passage scoring against independently labelled events."""
from collections import defaultdict
import math


def score_passages(expected,actual,tolerance=.75):
    if not math.isfinite(tolerance) or not 0<tolerance<=10:raise ValueError('Invalid timing tolerance')
    groups=defaultdict(lambda:[[],[]])
    for side,events in enumerate((expected,actual)):
        ids=set()
        for event in events:
            if not isinstance(event['id'],str) or not event['id'] or event['id'] in ids:raise ValueError('Event IDs must be unique')
            ids.add(event['id'])
            if not isinstance(event['line_id'],str) or not event['line_id']:raise ValueError('Invalid line ID')
            if event['direction'] not in {'entry','exit'} or not math.isfinite(event['time']) or event['time']<0:
                raise ValueError('Invalid labelled event')
            groups[event['line_id'],event['direction']][side].append(event)
    matches=[];missed=[];unexpected=[]
    for references,predictions in groups.values():
        references.sort(key=lambda e:(e['time'],e['id']));predictions.sort(key=lambda e:(e['time'],e['id']))
        i=j=0
        # Equal-width timing windows admit a maximal chronological matching.
        # Never use one prediction to cover two crossings or ignore duplicates.
        while i<len(references) and j<len(predictions):
            reference,prediction=references[i],predictions[j]
            error=prediction['time']-reference['time']
            if error < -tolerance:unexpected.append(prediction['id']);j+=1
            elif error > tolerance:missed.append(reference['id']);i+=1
            else:
                matches.append(dict(expected=reference['id'],actual=prediction['id'],time_error=error));i+=1;j+=1
        missed.extend(event['id'] for event in references[i:]);unexpected.extend(event['id'] for event in predictions[j:])
    tp=len(matches);fp=len(unexpected);fn=len(missed)
    return dict(expected=tp+fn,predicted=tp+fp,true_positive=tp,false_positive=fp,false_negative=fn,
                precision=tp/(tp+fp) if tp+fp else None,recall=tp/(tp+fn) if tp+fn else None,
                f1=2*tp/(2*tp+fp+fn) if tp+fp+fn else None,matches=matches,missed=missed,unexpected=unexpected)
