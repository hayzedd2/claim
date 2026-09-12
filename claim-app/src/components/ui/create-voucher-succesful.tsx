import { useState } from "react"
import QRCode from "react-qr-code"
import type { Voucher } from "@/types/voucher"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "./empty"
import { Button } from "./button"
import { Copy, Check, ShieldCheck, Download } from "lucide-react"

interface CreateVoucherSuccessfulProps {
  voucher: Voucher
  onReset?: () => void
}

export const CreateVoucherSuccessful = ({
  voucher,
  onReset,
}: CreateVoucherSuccessfulProps) => {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const redeemUrl = `${window.location.origin}/redeem/${encodeURIComponent(voucher.code)}`
  const shareMessage = `🎁 Here's a ₦${voucher.amount.toLocaleString()} voucher (${voucher.name}) for you! Redeem code: ${voucher.code}`

  const handleCopyCode = () => {
    navigator.clipboard.writeText(voucher.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(redeemUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Claim Voucher: ${voucher.name}`,
          text: shareMessage,
          url: redeemUrl,
        })
      } catch (err) {
        // user cancelled or failed, fallback to copy
      }
    } else {
      handleCopyLink()
    }
  }

  const handleDownloadQR = () => {
    const svg = document.getElementById("voucher-qr-code")
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      canvas.width = 600
      canvas.height = 600
      if (ctx) {
        // Draw crisp background & QR
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, 600, 600)
        ctx.drawImage(img, 50, 50, 500, 500)

        const pngFile = canvas.toDataURL("image/png")
        const downloadLink = document.createElement("a")
        downloadLink.download = `claim-voucher-${voucher.code}.png`
        downloadLink.href = pngFile
        downloadLink.click()
      }
    }

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`
  }

  const shareChannels = [
    {
      id: "x",
      name: "X (Twitter)",
      icon: (
        <svg className="size-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      action: () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(redeemUrl)}`
        window.open(url, "_blank")
      },
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: (
        <svg className="size-4 fill-current" viewBox="0 0 32 32">
          <path d="M16,2c-7.732,0-14,6.268-14,14s6.268,14,14,14,14-6.268,14-14S23.732,2,16,2Zm6.489,9.521c-.211,2.214-1.122,7.586-1.586,10.065-.196,1.049-.583,1.401-.957,1.435-.813,.075-1.43-.537-2.218-1.053-1.232-.808-1.928-1.311-3.124-2.099-1.382-.911-.486-1.412,.302-2.23,.206-.214,3.788-3.472,3.858-3.768,.009-.037,.017-.175-.065-.248-.082-.073-.203-.048-.29-.028-.124,.028-2.092,1.329-5.905,3.903-.559,.384-1.065,.571-1.518,.561-.5-.011-1.461-.283-2.176-.515-.877-.285-1.574-.436-1.513-.92,.032-.252,.379-.51,1.042-.773,4.081-1.778,6.803-2.95,8.164-3.517,3.888-1.617,4.696-1.898,5.222-1.907,.116-.002,.375,.027,.543,.163,.142,.115,.181,.27,.199,.379,.019,.109,.042,.357,.023,.551Z" />
        </svg>
      ),
      action: () => {
        const url = `https://t.me/share/url?url=${encodeURIComponent(redeemUrl)}&text=${encodeURIComponent(shareMessage)}`
        window.open(url, "_blank")
      },
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: (
        <svg className="size-4 fill-current" viewBox="0 0 24 24">
          <path d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.188 8.188 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.69 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.17-.48-.29z" />
        </svg>
      ),
      action: () => {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareMessage}\n${redeemUrl}`)}`
        window.open(url, "_blank")
      },
    },
    {
      id: "copy",
      name: "Copy link",
      icon: copiedLink ? (
        <Check className="size-4 text-green-600" />
      ) : (
        <Copy className="size-4" />
      ),
      action: handleCopyLink,
    },
    {
      id: "download",
      name: "Save QR",
      icon: <Download className="size-4" />,
      action: handleDownloadQR,
    },
  ]

  return (
    <Empty className="border border-border/80 bg-card p-6 transition-all duration-300">
      <EmptyHeader>
        <EmptyMedia className="mb-3">
          <QRCode
            id="voucher-qr-code"
            value={redeemUrl}
            size={140}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox="0 0 256 256"
          />
        </EmptyMedia>

        <EmptyTitle className="text-base font-semibold text-foreground">
          {isSharing ? "Share Your Voucher" : voucher.name || "Voucher Ready!"}
        </EmptyTitle>
        <EmptyDescription className="text-xs">
          {isSharing
            ? "Choose a channel or download the QR code to distribute."
            : "Scan the QR code or share the details below to redeem this voucher."}
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent className="w-full max-w-md space-y-3">
        {/* VIEW 1: Standard Voucher Metadata Details */}
        {!isSharing ? (
          <>
            <div className="w-full overflow-hidden rounded-xl border border-border/80 bg-muted/20 text-left">
              <div className="flex items-center justify-between border-b border-border/50 p-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Redeem via
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {voucher.code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                    title="Copy code"
                  >
                    {copiedCode ? (
                      <Check className="size-3.5 text-green-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-border/50 p-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Amount
                </span>
                <span className="text-xs font-semibold text-foreground">
                  ₦{voucher.amount.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-border/50 p-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Max Redemptions
                </span>
                <span className="text-xs font-medium text-foreground">
                  {voucher.max_redemptions}{" "}
                  {voucher.max_redemptions === 1 ? "claim" : "claims"}
                </span>
              </div>

              <div className="flex items-center justify-between p-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Valid until
                </span>
                <span className="text-xs font-medium text-foreground">
                  {new Date(voucher.expiry_date).toLocaleDateString()}
                </span>
              </div>

              {voucher.has_security_question && (
                <div className="flex items-center gap-1.5 border-t border-border/50 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-500">
                  <ShieldCheck className="size-3.5 shrink-0" />
                  <span>Security challenge required to redeem</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex w-full gap-2 pt-2">
              {onReset && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onReset}
                  className="flex-1 cursor-pointer"
                >
                  <span>Create Another</span>
                </Button>
              )}

              <Button
                type="button"
                onClick={() => setIsSharing(true)}
                className="flex-1 cursor-pointer"
              >
                <span>Share Voucher</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="w-full animate-in space-y-3 duration-300 zoom-in-95 fade-in">
            <div className="flex justify-center gap-2">
              {shareChannels.map((channel) => (
                <Button
                  key={channel.id}
                  type="button"
                  onClick={channel.action}
                  size="icon-lg"
                  variant="outline"
                  className="cursor-pointer"
                  title={channel.name}
                >
                  {channel.icon}
                </Button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSharing(false)}
                className="cursor-pointer"
              >
                <span>Back to Voucher Details</span>
              </Button>
              {typeof navigator !== "undefined" && "share" in navigator && (
                <Button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex-1 cursor-pointer"
                >
                  More sharing options
                </Button>
              )}
            </div>
          </div>
        )}
      </EmptyContent>
    </Empty>
  )
}

export default CreateVoucherSuccessful
