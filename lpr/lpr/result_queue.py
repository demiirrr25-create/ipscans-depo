"""Bounded OCR delivery with reserved space for accepted crossings on shutdown."""
from queue import Queue, Full


class ResultQueue(Queue):
    def __init__(self, maxsize, reserve=17):
        super().__init__(maxsize=maxsize)
        self.reserve = reserve

    def publish(self, batch, *, final=False):
        try:
            self.put_nowait(batch)
        except Full:
            # The producer must stop after saturation. Preserve its last accepted
            # crossing and at most one final batch from each of 16 cameras.
            if batch.get('passages'):
                with self.not_empty:
                    if self._qsize() >= self.maxsize + self.reserve:
                        raise RuntimeError('Final delivery reserve exhausted')
                    self._put(batch)
                    self.unfinished_tasks += 1
                    self.not_empty.notify()
            if not final:
                raise
