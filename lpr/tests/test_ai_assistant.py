import io
import json
from lpr.ai_assistant import Assistant
from lpr import ollama_runtime


def test_vision_result_needs_valid_plate_and_retains_ocr(monkeypatch):
    monkeypatch.setattr(ollama_runtime, 'ensure_runtime', lambda *args: None)
    assistant = Assistant()
    calls = []
    def fake_request(path, payload, *args):
        calls.append((path, payload))
        if path == 'pull':
            return io.BytesIO(b'{"status":"success"}\n')
        return io.BytesIO(json.dumps({'response': json.dumps({'plate': '06AB123', 'readable': True, 'reason': 'Görsel okuma'})}).encode())
    monkeypatch.setattr(assistant, 'request', fake_request)
    event = {'event_id': 'event', 'plate': '34ABC123', 'images': {'plate': b'jpeg'}}
    assistant.run('gemma3:4b', event)
    result = assistant.snapshot()['result']
    assert result['plate'] == '06AB123' and result['ocr_plate'] == '34ABC123' and not result['agrees']
    assert event['plate'] == '34ABC123'
    assert calls[-1][1]['keep_alive'] == 0 and calls[-1][1]['images']


def test_cancel_discards_result(monkeypatch):
    monkeypatch.setattr(ollama_runtime, 'ensure_runtime', lambda *args: None)
    assistant = Assistant(); assistant.stop()
    assistant.run('gemma3:4b', None)
    assert assistant.snapshot()['result'] is None
    assert assistant.snapshot()['phase'] == 'disabled'
