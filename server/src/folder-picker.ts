import { exec } from 'node:child_process';

export function openNativeFolderPicker(): Promise<string | null> {
  return new Promise((resolve) => {
    // Clean ASCII command to avoid Unicode serialization issues on Windows
    const psCmd = `powershell.exe -NoProfile -STA -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select Project Folder'; $f.ShowNewFolderButton = $true; $top = New-Object System.Windows.Forms.Form; $top.TopMost = $true; $top.StartPosition = 'CenterScreen'; if ($f.ShowDialog($top) -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath } else { Write-Output '' }"`;

    exec(psCmd, { timeout: 30000 }, (error, stdout) => {
      if (error) {
        console.error('Native folder picker notice:', error.message);
        resolve(null);
        return;
      }
      const selected = (stdout || '').trim();
      resolve(selected.length > 0 ? selected : null);
    });
  });
}
