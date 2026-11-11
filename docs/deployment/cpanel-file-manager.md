# cPanel installation using File Manager

This guide installs a manually built release package on shared cPanel hosting without running Node.js or npm on the server. It is domain-independent: choose the domain or subdomain later, then set its document root to the package's `public` directory. It does not run database migrations or seeders.

## Release package layout

The GitHub Actions artifact contains one ZIP with this layout:

```text
clinic-system-cpanel-<commit>/
├── INSTALLATION.md
├── private/
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/migrations/
│   ├── resources/
│   ├── routes/
│   ├── storage/
│   ├── vendor/
│   └── .env.production.example
└── public/
    ├── build/                 # Fresh Vite output and manifest
    ├── fonts/
    ├── .htaccess
    └── index.php
```

`public/index.php` expects `private/` to be a sibling of the selected document-root directory and explicitly points Laravel's public path at the deployed web directory so Vite can find `public/build/manifest.json`. Keep the complete `private` directory outside every web-accessible document root. Do not upload local `.env` files, database dumps, logs, uploads, or `node_modules`.

GitHub Actions builds a selected committed revision only. It cannot include uncommitted changes from a developer's working tree. The workflow checks that the committed source and fresh bundle both contain the approved New Visit sidebar entry; a revision without it fails before packaging.

## System Health cPanel application package

The Super Admin **cPanel application package** download is a separate, self-contained application archive. It contains this layout:

```text
INSTALLATION.md
private/                 # Laravel source, vendor, bootstrap, and writable skeleton
public_html/             # public entry point, build assets, fonts, and .htaccess
```

It deliberately excludes the database, uploaded media, `.env`, logs, tests, local databases, and credentials. Extract the archive in the cPanel account home directory, keep `private/` outside the document root, and copy the contents of `public_html/` into the selected document root. Do not extract `private/` into a served directory. Use the separate Database and Media backup actions when an approved backup procedure requires those data sets.

## 1. Confirm hosting requirements

Before installing, ask the hosting provider to confirm the domain's PHP 8.3 runtime and extensions. The locked production Composer platform check currently requires PHP 8.3 plus DOM, fileinfo, filter, hash, iconv, libxml, OpenSSL, PCRE, session, tokenizer, XML, XMLWriter, and Phar; the application also needs PDO MySQL for its configured database driver. Composer currently supplies ctype and mbstring through polyfills. `intl`, `gd`, and ZIP are provisioned in CI but are not mandatory in the current Composer platform check; confirm them with the provider before relying on features or host tools that may use them. Confirm the MySQL-compatible server version and collation supported by the account. CI does not establish the host's exact extensions or database behavior.

Select PHP 8.3 for the chosen domain in cPanel. If the host cannot provide the required runtime or extensions, stop and resolve that with the provider before exposing the application.

## 2. Choose the domain and document root

Create or select the domain/subdomain in cPanel. Configure its document root to the release's `public` directory, or choose a private release location and have the provider set that document root. The domain is not embedded in the package. Set `APP_URL` and mail settings later to match the selected domain.

Keep the package's `private` directory outside the document root. If cPanel only allows `public_html`, place the private directory beside `public_html` in the account's home directory and ensure the `public_html` entry point resolves to that sibling `private` directory. Do not put Laravel source, `vendor`, `.env`, `storage`, or backups inside a served directory.

## 3. Upload and extract with File Manager

1. In cPanel File Manager, enable viewing hidden files only when needed to manage the private `.env` later.
2. Upload the downloaded release ZIP into a directory outside the document root, such as a new release folder in the account home directory.
3. Compare the downloaded ZIP's SHA-256 value with the `.sha256` file from the same GitHub Actions artifact. Use a trusted local checksum utility. Do not edit the ZIP.
4. Extract the ZIP. Confirm it contains only the expected `private`, `public`, and installation guide entries.
5. Keep `private` outside the document root. Point the chosen domain's document root at the extracted `public` directory. If cPanel cannot point there, ask the hosting provider for a supported private/public layout; do not improvise by exposing the private folder.

## 4. Create a production database in cPanel

Use cPanel's MySQL Database Wizard to create a new production database and a dedicated database user. Grant that user only the privileges required by the separately reviewed installation/migration procedure. Record the exact database host, database name, and account name shown by cPanel; shared hosts often add an account prefix. Do not import `clinic_app`, sandbox databases, backups, or patient records.

The schema installation and upgrade process is a separate approval gate. This package does not migrate or seed a database, and there is no web-accessible Artisan runner. With no SSH/Terminal access, obtain a host-supported administrative migration procedure before enabling application workflows. Do not paste migration SQL into phpMyAdmin unless a separate, reviewed procedure explicitly authorizes it.

## 5. Create the private environment file

In `private/`, make a copy of `.env.production.example` named `.env`, then edit that private copy in File Manager. Never place `.env` under the document root or include it in a future package.

Set:

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL` to the exact HTTPS URL selected for this installation
- `DB_CONNECTION=mysql`, the host and port supplied by cPanel, and the new database/user credentials
- Secure session, cache, queue, mail, and filesystem values appropriate to the reviewed schema and hosting plan

Generate a unique Laravel `APP_KEY` using a trusted local/offline process or the hosting provider's secure setup assistance. Enter it directly into the private `.env`; do not put it in chat, source control, the ZIP, a ticket, or a public page. Preserve the same key for updates and backups. Changing it can invalidate encrypted application data and sessions.

Set restrictive file permissions for `.env` and keep the parent directory inaccessible over HTTP. Do not share environment values in screenshots or support logs.

## 6. Check writable directories and storage

The PHP-FPM account needs write access only where Laravel requires it: `private/storage/framework`, `private/storage/logs`, and `private/bootstrap/cache`. Use the narrowest permissions the host supports. Avoid `777` and broad recursive permission changes. Keep `private/storage` outside the document root.

The application uses Laravel's public disk for selected public-facing assets. Do not copy or expose patient uploads. If a storage link is required, ask the hosting provider to create and verify a link from the document root's `storage` path to `private/storage/app/public`. File Manager may not support safe symlink creation. Do not expose the private storage directory as a normal web folder. The packaged upload `.htaccess` blocks server-side execution, but host behavior still requires verification.

## 7. Verify HTTPS and Apache protections

Use cPanel's SSL/TLS or AutoSSL feature to issue a trusted certificate for the selected hostname. Confirm the certificate's hostname and expiry, then verify HTTPS in a browser before user access. Configure HTTP-to-HTTPS redirection only after HTTPS works. Confirm secure cookies and that the host correctly reports HTTPS to Laravel.

Verify the domain's Apache configuration honors the packaged `.htaccess`: dotfiles, `.env`, `.git`, `vendor`, logs, backups, and private application files must not be retrievable. Confirm the public upload path cannot execute PHP or other server-side scripts. Check response headers and error pages without exposing stack traces. Keep `APP_DEBUG=false`.

## 8. Frontend assets and future updates

The release ZIP already contains the fresh Vite `public/build/manifest.json`, all assets referenced by the manifest, and the self-hosted Bengali font. No Node.js or npm process runs on cPanel.

For each approved update, download a new manually triggered GitHub Actions artifact and verify its checksum. Put the site into the separately approved maintenance window if required, keep the existing private `.env` and persistent storage, and replace the public build assets and reviewed application files from that artifact. Do not replace the production `.env`, `APP_KEY`, uploads, logs, or database. Verify manifest-referenced files and Bengali text after upload. A code-only rollback does not reverse database changes.

## 9. Safe error checks and readiness gate

Use cPanel's error viewer and protected application logs. Redact usernames, paths, patient identifiers, session values, and request data before sharing diagnostics. Never turn on `APP_DEBUG` on a public domain.

Do not open the application to clinical workflows until all of these have separate verification and approval: the database schema is installed/upgraded by a reviewed process; required role/permission state is correct; the exact PHP and MySQL versions are confirmed; HTTPS, storage restrictions, and writable directories are tested; and a restore procedure is available. Do not run seeders as routine deployment steps.

## 10. Future API deployment

The optional cPanel API deployment design is documented separately and remains disabled. Do not create API tokens or enable remote writes until the account, paths, backup/recovery process, and approval controls have been reviewed.
