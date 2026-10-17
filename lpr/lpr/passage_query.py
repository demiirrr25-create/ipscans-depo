"""Validated, parameterized filters for the vehicle passage ledger."""
from dataclasses import dataclass
import math
from .core import normalize_plate


@dataclass(frozen=True)
class PassageFilter:
    plate: str = ''
    camera: str = ''
    direction: str = ''
    vehicle_type: str = ''
    status: str = ''
    start: float | None = None
    end: float | None = None
    min_confidence: float = 0.
    max_confidence: float = 1.
    registration: str = ''
    block_id: int | None = None
    unit_id: int | None = None

    def sql(self,*,registry_available=True):
        if not isinstance(self.plate,str) or len(self.plate)>32:raise ValueError('Invalid plate filter')
        if not isinstance(self.camera,str) or len(self.camera)>64:raise ValueError('Invalid camera filter')
        if self.direction not in {'','entry','exit'}:raise ValueError('Invalid direction filter')
        if self.vehicle_type not in {'','car','motorcycle','bus','truck'}:raise ValueError('Invalid vehicle filter')
        if self.status not in {'','recognized','review','unread'}:raise ValueError('Invalid status filter')
        if not isinstance(self.registration,str) or self.registration not in {'','registered','unknown','review'}:raise ValueError('Invalid registration filter')
        for value in (self.block_id,self.unit_id):
            if value is not None and (type(value) is not int or value<=0):raise ValueError('Invalid location filter')
        if not all(math.isfinite(v) and 0<=v<=1 for v in (self.min_confidence,self.max_confidence)) or self.min_confidence>self.max_confidence:
            raise ValueError('Invalid confidence range')
        for value in (self.start,self.end):
            if value is not None and (not math.isfinite(value) or value<0):raise ValueError('Invalid time filter')
        if self.start is not None and self.end is not None and self.start>=self.end:raise ValueError('Invalid date range')
        clauses=['confidence>=?','confidence<=?'];args=[self.min_confidence,self.max_confidence]
        if self.plate:
            plate=normalize_plate(self.plate)
            if not plate:raise ValueError('Empty normalized plate filter')
            clauses.append('instr(plate,?)>0');args.append(plate)
        for column,value in (('camera',self.camera),('direction',self.direction),('vehicle_type',self.vehicle_type),('status',self.status)):
            if value:clauses.append(column+'=?');args.append(value)
        if self.start is not None:clauses.append('at>=?');args.append(self.start)
        if self.end is not None:clauses.append('at<?');args.append(self.end)
        if self.registration:clauses.append('registration=?');args.append(self.registration)
        location=[];location_args=[]
        if self.block_id is not None:location.append('u.block_id=?');location_args.append(self.block_id)
        if self.unit_id is not None:location.append('u.id=?');location_args.append(self.unit_id)
        if location:
            if not registry_available:clauses.append('0')
            else:
                # Both filters must refer to the same authorized person's unit.
                # EXISTS avoids duplicate events for vehicles with many owners.
                clauses.append('EXISTS (SELECT 1 FROM vehicle_owners vo JOIN residents resident ON resident.id=vo.resident_id '
                    'JOIN units u ON u.id=resident.unit_id WHERE vo.vehicle_id=vehicle_passages.registry_vehicle_id AND '+' AND '.join(location)+')')
                args.extend(location_args)
        return clauses,args


def passage_source(db):
    """Project the latest reviewed plate and only evidence-backed registry links.

    Optional schemas allow older local ledgers and maintenance exports to remain
    readable without silently running migrations during a read operation.
    """
    tables={row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    has_reviews='passage_reviews' in tables
    has_registry={'vehicles','vehicle_owners','residents','units','blocks'}<=tables
    corrected='review.plate' if has_reviews else 'NULL'
    trusted="(p.status='recognized'"+(" OR review.id IS NOT NULL)" if has_reviews else ")")
    effective=f'coalesce({corrected},p.plate)'
    join=''
    if has_reviews:
        join+=' LEFT JOIN passage_reviews review ON review.id=(SELECT id FROM passage_reviews r WHERE r.event_id=p.event_id ORDER BY r.id DESC LIMIT 1)'
    if has_registry:
        join+=f" LEFT JOIN vehicles registry ON registry.plate={effective} AND {trusted} AND registry.status!='unknown'"
    vehicle_id='registry.id' if has_registry else 'NULL'
    registry_status='registry.status' if has_registry else 'NULL'
    registration=f"CASE WHEN NOT {trusted} THEN 'review' WHEN {vehicle_id} IS NOT NULL THEN 'registered' ELSE 'unknown' END"
    fields='p.event_id,p.at,p.camera,p.line_id,p.direction,p.track_id,p.vehicle_type,p.confidence,p.status,p.evidence_frames,p.frame_sequence'
    source=f'(SELECT {fields},p.plate AS original_plate,{effective} AS plate,{corrected} AS corrected_plate,'
    source+=f'{vehicle_id} AS registry_vehicle_id,{registry_status} AS registry_status,{registration} AS registration FROM vehicle_passages p{join}) AS vehicle_passages'
    return source,has_registry
