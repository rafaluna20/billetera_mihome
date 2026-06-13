"use client"

import QRCode from "react-qr-code"

interface UserQRProps {
  accountNumber: string
  userName: string
  phone?: string
}

export default function UserQR({ accountNumber, userName, phone }: UserQRProps) {
  // El QR contiene un payload JSON con la info del usuario para recibir pagos
  const qrPayload = JSON.stringify({
    type: "MHOME_PAY",
    account: accountNumber,
    name: userName,
    phone: phone || "",
  })

  return (
    <div className="w-[160px] h-[160px] bg-white rounded-2xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex items-center justify-center relative">
      <QRCode
        value={qrPayload}
        size={136}
        bgColor="#FFFFFF"
        fgColor="#4a1862"
        level="M"
        style={{ width: "100%", height: "100%" }}
      />
      {/* Logo en el centro del QR */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#00b5ad] rounded-xl flex items-center justify-center shadow-md border-2 border-white">
        <span className="text-white font-black text-[9px] leading-none text-center">Mi<br/>H</span>
      </div>
    </div>
  )
}
