/** Print utilities extracted from App.tsx */

const isIOSDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1;
};

const isAndroidDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
};

export const triggerPrint = (): void => {
  if (typeof window === 'undefined') return;

  if (isIOSDevice()) {
    try {
      setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.error('iOS print failed', e);
          alert('To print on iPhone: tap the Share icon in Safari, then choose "Print".');
        }
      }, 100);
      return;
    } catch (e) {
      console.error('iOS print scheduling failed', e);
    }
  }

  if (isAndroidDevice()) {
    try {
      const docHtml = document.documentElement.outerHTML;
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups, or use Chrome menu > Share > Print.');
        return;
      }
      printWindow.document.open();
      printWindow.document.write(docHtml);
      printWindow.document.close();
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch (e) {
            console.error('Android print failed', e);
          }
        }, 400);
      });
      return;
    } catch (e) {
      console.error('Android print fallback failed', e);
    }
  }

  try {
    window.print();
  } catch (e) {
    console.error('window.print failed', e);
  }
};
