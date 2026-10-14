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

    def sql(self):
        if not isinstance(self.plate,str) or len(self.plate)>32:raise ValueError('Invalid plate filter')
        if not isinstance(self.camera,str) or len(self.camera)>64:raise ValueError('Invalid camera filter')
        if self.direction not in {'','entry','exit'}:raise ValueError('Invalid direction filter')
        if self.vehicle_type not in {'','car','motorcycle','bus','truck'}:raise ValueError('Invalid vehicle filter')
        if self.status not in {'','recognized','review','unread'}:raise ValueError('Invalid status filter')
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
        return clauses,args
