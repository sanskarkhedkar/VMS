import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../../lib/api';
import { getFullName, formatTime } from '../../lib/utils';
import { QrCode, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CheckIn() {
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const navigate = useNavigate();

  const checkInMutation = useMutation({
    mutationFn: async (qrData) => {
      const response = await api.post('/visits/checkin-qr', { qrData });
      return response.data.data;
    },
    onSuccess: (data) => {
      setScanResult(data);
      toast.success('Visitor checked in successfully!');
    },
    onError: (error) => {
      setScanError(error.response?.data?.message || 'Check-in failed');
      toast.error(error.response?.data?.message || 'Check-in failed');
    },
  });

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('qr-reader', {
      qrbox: { width: 250, height: 250 },
      fps: 5,
    });

    scanner.render(
      (decodedText) => {
        scanner.clear();
        checkInMutation.mutate(decodedText);
      },
      (error) => {
        // Silently ignore scan errors
      }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  const resetScanner = () => {
    setScanResult(null);
    setScanError(null);
    window.location.reload();
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <QrCode className="w-8 h-8 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          QR Check-In
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Scan the visitor's QR code to check them in
        </p>
      </div>

      {/* Success Result */}
      {scanResult && (
        <div className="card p-6 text-center animate-scale-in">
          <div className="w-20 h-20 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-success-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Check-In Successful!
          </h2>
          
          <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-4 mt-4 text-left">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Visitor</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {scanResult.visitorName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Host</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {scanResult.hostName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Check-In Time</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {formatTime(scanResult.checkInTime || new Date())}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={resetScanner}
            className="btn-primary w-full mt-6"
          >
            Scan Another
          </button>
        </div>
      )}

      {/* Error Result */}
      {scanError && !scanResult && (
        <div className="card p-6 text-center animate-scale-in">
          <div className="w-20 h-20 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-danger-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Check-In Failed
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            {scanError}
          </p>
          <button
            onClick={resetScanner}
            className="btn-primary w-full mt-6"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Scanner */}
      {!scanResult && !scanError && (
        <div className="card overflow-hidden">
          {checkInMutation.isPending ? (
            <div className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-slate-500">Processing check-in...</p>
            </div>
          ) : (
            <div id="qr-reader" className="w-full" />
          )}
        </div>
      )}

      {/* Manual Entry Option */}
      {!scanResult && !scanError && (
        <div className="mt-6 text-center">
          <p className="text-slate-500 mb-3">Or enter pass number manually</p>
          <button className="btn-secondary">
            Enter Pass Number
          </button>
        </div>
      )}
    </div>
  );
}
