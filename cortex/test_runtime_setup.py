import io,json,unittest
from unittest.mock import patch,Mock
import runtime_setup

class RuntimeTests(unittest.TestCase):
    def test_existing_runtime_does_not_download_or_launch(self):
        with patch.object(runtime_setup.urllib.request,'urlopen',return_value=io.BytesIO(b'{"models":[]}')) as request,patch.object(runtime_setup.subprocess,'Popen') as launch:
            runtime_setup.ensure_runtime(Mock(),Mock())
        self.assertEqual(request.call_count,1);launch.assert_not_called()

    def test_existing_binary_is_started_and_health_checked(self):
        with patch.object(runtime_setup.urllib.request,'urlopen',side_effect=[OSError(),io.BytesIO(b'{"models":[]}')]),patch.object(runtime_setup.shutil,'which',return_value='C:/test/ollama.exe'),patch.object(runtime_setup.pathlib.Path,'is_file',return_value=True),patch.object(runtime_setup.subprocess,'Popen') as launch:
            runtime_setup.ensure_runtime(Mock(),Mock())
        self.assertEqual(launch.call_args.args[0][-1],'serve')
        self.assertEqual(launch.call_args.kwargs['env']['OLLAMA_HOST'],'127.0.0.1:11434')

    def test_unverified_asset_never_runs(self):
        metadata={'assets':[{'name':'ollama-windows-amd64.zip','digest':''}]}
        with patch.object(runtime_setup.urllib.request,'urlopen',side_effect=[OSError(),io.BytesIO(json.dumps(metadata).encode())]),patch.object(runtime_setup.shutil,'which',return_value=None),patch.object(runtime_setup.pathlib.Path,'is_file',return_value=False),patch.object(runtime_setup.subprocess,'Popen') as launch:
            with self.assertRaises(RuntimeError):runtime_setup.ensure_runtime(Mock(),Mock())
        launch.assert_not_called()
