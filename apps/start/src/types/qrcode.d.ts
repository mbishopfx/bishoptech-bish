declare module 'qrcode' {
  type ToDataURLOptions = {
    errorCorrectionLevel?: string
    margin?: number
    width?: number
  }

  type QRCodeModule = {
    toDataURL: (text: string, options?: ToDataURLOptions) => Promise<string>
  }

  const QRCode: QRCodeModule
  export default QRCode
}
