import { useState, useCallback } from 'react'

type CopyButtonProps = {
  getText: () => string
  label?: string
}

function CopyButton({ getText, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      const text = getText()
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard API not available — silent fail
    }
  }, [getText])

  return (
    <button
      id={`copy-btn-${label.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2)}`}
      className={`copy-btn${copied ? ' copied' : ''}`}
      onClick={handleCopy}
      title={copied ? 'Copied!' : `Copy ${label}`}
      type="button"
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

export default CopyButton
