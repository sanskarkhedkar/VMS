import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../../lib/api';
import { downloadFile, getFullName, formatTime } from '../../lib/utils';
import { QrCode, CheckCircle, AlertCircle, Loader2, ArrowLeft, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CheckIn() {
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [manualPass, setManualPass] = useState('');
  const [manualError, setManualError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const scannerRef = useRef(null);
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

  const manualCheckInMutation = useMutation({
    mutationFn: async (passNumber) => {
      const trimmed = passNumber.trim();
      if (!trimmed) {
        throw new Error('Enter a pass number to continue');
      }

      const searchParams = new URLSearchParams({
        search: trimmed,
        limit: 1,
      });

      const visitResponse = await api.get(`/visits?${searchParams.toString()}`);
      const visit = visitResponse.data?.data?.[0];

      if (!visit || !visit.passNumber) {
        throw new Error('No visit found for this pass number');
      }

      if (visit.passNumber.toUpperCase() !== trimmed.toUpperCase()) {
        throw new Error('Invalid pass number');
      }

      if (visit.status !== 'APPROVED') {
        throw new Error(`Cannot check in. Visit status: ${visit.status}`);
      }

      const response = await api.post(`/visits/${visit.id}/checkin`);
      return response.data.data;
    },
    onSuccess: (data) => {
      setScanResult(data);
      setManualError(null);
      toast.success('Visitor checked in successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || error.message || 'Check-in failed';
      setManualError(message);
      toast.error(message);
    },
  });

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    setScanError(null);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
      }

      if (!scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner('qr-reader', {
          qrbox: { width: 250, height: 250 },
          fps: 5,
        });
      }

      setScanning(true);
      scannerRef.current.render(
        (decodedText) => {
          scannerRef.current?.clear();
          setScanning(false);
          checkInMutation.mutate(decodedText);
        },
        () => {}
      );
    } catch (err) {
      setScanning(false);
      setScanError('Camera permission is required to scan');
      toast.error('Camera permission is required to scan');
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setScanError(null);
    setManualPass('');
    setManualError(null);
    setScanning(false);
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
  };

  const handlePrintPass = async () => {
    const visitId = scanResult?.visit?.id || scanResult?.visitId;

    if (!visitId) {
      toast.error('Visit details are missing. Please try scanning again.');
      return;
    }

    try {
      setIsPrinting(true);
      const response = await api.get(`/visits/${visitId}/entry-pass`, {
        responseType: 'blob',
      });

      const filename = scanResult?.visit?.passNumber
        ? `entry-pass-${scanResult.visit.passNumber}.pdf`
        : 'entry-pass.pdf';

      downloadFile(response.data, filename);

      const url = window.URL.createObjectURL(response.data);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not generate entry pass');
    } finally {
      setIsPrinting(false);
    }
  };

  const visitInfo = scanResult?.visit;
  const visitorName = scanResult?.visitorName || getFullName(visitInfo?.visitor);
  const hostName = scanResult?.hostName || getFullName(visitInfo?.hostEmployee);
  const checkInDisplay = formatTime(scanResult?.checkInTime || visitInfo?.actualTimeIn || new Date());

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
              {visitInfo?.passNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Pass Number</span>
                  <span className="font-mono font-semibold text-primary-700 dark:text-primary-300">
                    {visitInfo.passNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Visitor</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {visitorName}
                </span>
              </div>
              {visitInfo?.visitor?.company && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Company</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {visitInfo.visitor.company}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Host</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {hostName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Check-In Time</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {checkInDisplay}
                </span>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            <button
              onClick={handlePrintPass}
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={isPrinting}
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Preparing PDF...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" /> Print Entry Pass
                </>
              )}
            </button>
            <button
              onClick={resetScanner}
              className="btn-secondary w-full"
            >
              Scan Another
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            The downloaded PDF includes the visitor details and on-site instructions for the guest.
          </p>
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
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <QrCode className="w-5 h-5 text-primary-500" />
              <span className="font-semibold">Scan Visitor QR</span>
            </div>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={startScanning}
              disabled={scanning || checkInMutation.isPending}
            >
              {scanning ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </div>
              ) : (
                'Start Scanning'
              )}
            </button>
          </div>
          {checkInMutation.isPending ? (
            <div className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-slate-500">Processing check-in...</p>
            </div>
          ) : (
            <div className="p-4 text-center text-slate-500">
              <div id="qr-reader" className="w-full min-h-[320px]" />
              {!scanning && (
                <p className="mt-3 text-sm text-slate-500">
                  Click &ldquo;Start Scanning&rdquo; to request camera access and scan the QR.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Entry Option */}
      {!scanResult && !scanError && (
        <div className="mt-6 card p-5">
          <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">
            Enter pass number manually
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Type the visitor&apos;s entry pass to check them in without scanning.
          </p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setManualError(null);
              manualCheckInMutation.mutate(manualPass);
            }}
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={manualPass}
                onChange={(e) => {
                  setManualPass(e.target.value);
                  if (manualError) setManualError(null);
                }}
                placeholder="e.g. VMS-123456"
                className="input flex-1 uppercase"
                disabled={manualCheckInMutation.isPending}
              />
              <button
                type="submit"
                className="btn-secondary whitespace-nowrap"
                disabled={manualCheckInMutation.isPending}
              >
                {manualCheckInMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </div>
                ) : (
                  'Check In'
                )}
              </button>
            </div>
            {manualError && (
              <p className="text-sm text-danger-600 dark:text-danger-400">{manualError}</p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
