# Camera transport settings and fallback

The camera setup flow offers TCP, UDP and Auto. Existing cameras also have a dedicated transport setting action so credentials need not be re-entered. The selected setting is tested in live preview and saved only after the operator confirms a fresh decoded frame. The camera table displays the saved policy; live preview and grid display the currently attempted/connected transport.

The database migration adds a non-null `transport` column with TCP as the legacy default. It preserves existing encrypted credentials, names, directions and line definitions. Saving uses explicit column names and requires the existing manage permission. Preview, camera-center workers and the live recognition subprocess all receive the same persisted policy.

Auto begins with TCP. After an unsuccessful open or interrupted stream, it alternates TCP/UDP within the existing retry budget and exponential delay. With the default five retries, at most six consecutive unsuccessful attempts occur before `retry_exhausted`. Thirty decoded frames reset the consecutive failure budget; a sustained working stream may reconnect after a later interruption. Explicit TCP or UDP never silently changes transport. Changing settings does not alter an already running capture; the connection test and later views instantiate workers with the new policy.

Validation on 2026-10-14:

- 120 automated tests passed. New coverage includes legacy database migration and repeat opening, persisted transport after reopening, unauthorized/invalid updates, save only after confirmation, TCP→UDP recovery and finite failure sequences for all three policies.
- Controlled integration test: the first TCP open was deliberately replaced with a failed-open adapter, while UDP used the real isolated decoder and the user-designated Mercusys MC510. Auto switched once to UDP and delivered 144 frames at 2304×1296 over a 12-second run, first frame at 3.61 seconds, clean shutdown and no final error. This verifies recovery into a real UDP stream; it is not evidence of a naturally occurring TCP network outage.
- Source-mode camera settings screen rendered and visually inspected with three explicitly synthetic cameras.

The preceding isolated-capture checkpoint separately verified real TCP and UDP in a frozen Windows EXE. This policy/UI checkpoint has not yet been rebuilt into a released installer. Authentication/path/codec failure classification, ONVIF, hardware decode and broad multi-camera testing remain open. Fallback is a connectivity attempt, not a diagnosis of the failure cause.
