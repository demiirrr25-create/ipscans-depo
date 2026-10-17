# Verified update staging

`lpr.updates` provides verification and local staging. It never starts an installer, changes Windows signature policy, elevates privileges, replaces the running program, or rolls the application back. There is no production signing certificate configured in this release. Current unsigned development installers **cannot** pass this update gate.

## Trust model

Deployment policy supplies a trusted HTTPS manifest URL, channel, exact Windows product name and the **SHA-256 fingerprint of the signer's DER certificate**. Obtain the fingerprint through a separately authenticated release/signing process, then pin it in administrator-managed application configuration or a signed application build. Never copy a key/fingerprint from the update manifest, infer trust from a download domain, or silently accept a newly encountered signer.

No pin means `signing_not_configured`: check, stage and rollback inspection perform no network download. The manifest cannot provide its own publisher identity; unknown fields are rejected.

Verification requires all of:

1. HTTPS with standard certificate validation. Manifest and package URLs, including every redirect, must use the configured origin (host and effective port). Cross-origin redirects, HTTP downgrade and URL credentials are refused. Use a direct trusted hosting origin for both files; GitHub/Blob redirect chains across hosts do not qualify.
2. Exact declared byte count and SHA-256. JSON is bounded to 64 KiB; installers to 512 MiB. Downloads use bounded reads, socket timeout and total deadline, and reject content encoding and incomplete HTTP bodies.
3. Windows `Get-AuthenticodeSignature` returns `Valid`. A valid Windows trust result alone is insufficient: the signer certificate's SHA-256 must also match the external pin. The verifier invokes the system Windows PowerShell with its system module directory, without profiles or caller-provided module imports.
4. Signed `ProductName` and `ProductVersion` resources match the configured product and manifest version. Inno Setup's trailing resource padding is ignored. A different signed product or an older signed installer cannot impersonate the offered release by changing unsigned JSON.
5. Version and channel checks. Supported version forms are `1.0.0`, `1.0.0rc1` and `1.0.0.dev1`, compared numerically. Stable manifests require a final version. Staging refuses the current version, older versions and versions below the highest previously staged version.

The JSON metadata is transported over trusted HTTPS but is **not separately digitally signed**. Package authenticity comes from Windows Authenticode, the externally pinned certificate and exact signed product/version resources. Publishing permissions for the HTTPS origin remain security-sensitive.

Microsoft references: [Get-AuthenticodeSignature](https://learn.microsoft.com/powershell/module/microsoft.powershell.security/get-authenticodesignature), [FileVersionInfo.ProductVersion](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.fileversioninfo.productversion).

## Manifest

The complete schema has exactly these fields; replace the sample hash and size with actual signed-package values:

```json
{
  "schema": 1,
  "app": "ipscans-lpr-pro",
  "version": "1.0.1",
  "channel": "stable",
  "url": "https://updates.example.test/lpr/setup.exe",
  "sha256": "<64 lowercase hexadecimal characters>",
  "size": 123456789
}
```

This is a schema example, not an existing production release or endpoint. Sign the final installer before calculating its hash and size. The installer must embed the exact intended product name and release string in its version resources. Preview installers use the separate `IPScans LPR Pro Preview` identity; they are not interchangeable with a production policy.

## Settings integration

```python
from lpr.updates import UpdatePolicy, UpdateManager

policy = UpdatePolicy(
    manifest_url=administrator_config.manifest_url,
    channel=administrator_config.channel,
    publisher_sha256=administrator_config.pinned_certificate_sha256,
    product_name="IPScans LPR Pro",
)
manager = UpdateManager(private_data_directory / "verified-updates", policy)
status = manager.check(current_version)
# Display status.message; only update_available has a newer candidate.
# On the user's download action, off the GUI thread:
if status.code == "update_available":
    status = manager.stage(status.manifest, current_version)
```

`UpdateStatus` exposes `code`, user-facing `message`, optional `manifest`, and a verified local `path` only after successful package verification. Run network and Authenticode work on a background worker. An administrator capability check belongs at the Settings action boundary. Do not claim a manifest is signature-verified merely because `check()` returned `update_available`.

Status codes: `signing_not_configured`, `update_available`, `up_to_date`, `staged`, `previous_verified`, `no_previous`, `not_staged`, `failed`.

The standalone `UpdatesPanel` in `lpr.updates_ui` provides the operator review UI:

```python
panel = UpdatesPanel(ops, session, data_directory, current_version,
                     product_name="IPScans LPR Pro Preview")
settings_layout.addWidget(panel)
# During window/session shutdown:
panel.shutdown()
```

It starts with no invented endpoint or signing identity. An authenticated administrator may explicitly configure the local `update-policy.json` through the policy editor; this file is separate from downloaded metadata. Its publication URL and signer fingerprint must be obtained through an independently trusted release channel. The file is replaced atomically and policy configuration requests are audited. Protect the application data directory with the Windows user's normal access controls; an application role is not a security boundary against another process already running as that Windows user.

Check, staging and previous-package verification run in a background thread with immutable policy arguments. Workers do not access SQLite or Qt widgets. Session checks run on the UI thread; expiration, close and cancellation signal the worker and suppress stale results. In-flight network reads and Windows signature verification finish within their bounded timeouts before cancellation is observed. The UI distinguishes an available but unverified release from a verified local package, displays version/hash/size, and can open only the staging folder. It has no installer execution action.

`candidate()` verifies a staged file again. `rollback_candidate()` verifies the previously staged package again, including signature, publisher, version, size and hash. Neither method installs anything. A returned path is not a promise that a file will remain unchanged indefinitely; any later installation workflow must revalidate immediately before use.

## Failure and rollback behavior

Download files are created exclusively in the staging directory. A package is atomically moved to a content-addressed filename only after verification. The `state.json` pointer is flushed to a temporary file and atomically replaced. Failed downloads, wrong signatures, tampering and failed pointer writes preserve the previous pointer and package. The current and previous verified packages are retained; only an older package recorded by this manager is retired after a successful pointer commit. A crash between package placement and state replacement can leave an unused verified package, but does not replace the previous pointer.

An exclusive stage lock prevents concurrent writers. A lock left by a crash fails closed and requires an authorized operator to establish that no updater is running before removing it. Corrupt state or changed trust policy fails closed instead of silently overwriting existing rollback information.

This module never touches application databases, camera secrets, images or retention settings. Retaining a previous installer is **not** proof that a database downgrade is compatible. A future installation/rollback workflow still needs a verified backup, explicit operator action and actual upgrade/rollback acceptance tests. There is no automatic rollback and no promise that the previously staged package was ever installed.

## Verification performed

- 34 isolated automated tests cover manifest restrictions, numeric version order, redirect origin checks, invalid signature status, wrong publisher/product/version, content tampering, bounds, truncated/interrupted downloads, failed state writes, concurrent staging, inconsistent version history, retained rollback and revalidation after local tampering.
- On this Windows host, the real system Authenticode query identified the existing `0.5.0.dev4` installer as `NotSigned`. It was not executed. The verifier therefore correctly refuses it as a signed update.
- Mock signatures in unit tests are explicitly synthetic. No genuine IPScans signed installer or signing certificate was available, so successful signed-update installation and production rollout remain unverified.
