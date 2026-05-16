import { Platform } from 'react-native';

/**
 * Cross-platform xlsx file picker.
 * Returns the file bytes, or null if the user cancelled.
 */
export async function pickXlsxFile(): Promise<Uint8Array | null> {
  if (Platform.OS === 'web') {
    return pickXlsxWeb();
  }
  return pickXlsxNative();
}

function pickXlsxWeb(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    input.style.display = 'none';

    let settled = false;
    const finish = (val: Uint8Array | null) => {
      if (settled) return;
      settled = true;
      try {
        document.body.removeChild(input);
      } catch {
        // ignore
      }
      resolve(val);
    };

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) {
        finish(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const buf = reader.result as ArrayBuffer;
        finish(new Uint8Array(buf));
      };
      reader.onerror = () => finish(null);
      reader.readAsArrayBuffer(file);
    });

    // Fallback: detect cancel via focus return (not 100% reliable across browsers,
    // but harmless if the change event fires later).
    const onFocus = () => {
      window.removeEventListener('focus', onFocus);
      setTimeout(() => {
        if (!input.files || input.files.length === 0) finish(null);
      }, 500);
    };
    window.addEventListener('focus', onFocus);

    document.body.appendChild(input);
    input.click();
  });
}

async function pickXlsxNative(): Promise<Uint8Array | null> {
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      '*/*',
    ],
    multiple: false,
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;
  const asset = result.assets && result.assets[0];
  if (!asset) return null;

  const FileSystem = await import('expo-file-system');
  // expo-file-system v19+ exposes the File class.
  const FileCtor = (FileSystem as any).File;
  if (FileCtor) {
    const f = new FileCtor(asset.uri);
    const bytes: Uint8Array = await f.bytes();
    return bytes;
  }

  // Fallback for older expo-file-system: read base64 then decode.
  const legacy = FileSystem as any;
  if (typeof legacy.readAsStringAsync === 'function') {
    const b64: string = await legacy.readAsStringAsync(asset.uri, {
      encoding: legacy.EncodingType?.Base64 ?? 'base64',
    });
    return base64ToBytes(b64);
  }

  throw new Error('No file-system API available to read the selected file');
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node-style Buffer fallback (shouldn't happen in RN, but safe).
  const g: any = globalThis as any;
  if (g.Buffer) return new Uint8Array(g.Buffer.from(b64, 'base64'));
  throw new Error('No base64 decoder available');
}
