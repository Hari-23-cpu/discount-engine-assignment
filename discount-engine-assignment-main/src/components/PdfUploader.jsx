import React, { useRef, useState } from 'react'

const S = {
  root: {
    padding: '1.1rem 1.2rem',
    background: '#fff',
    border: '2px dashed #FF5800',
    borderRadius: 7,
    textAlign: 'center',
    position: 'relative',
    cursor: 'pointer',
    transition: 'border-color 0.18s',
    color: '#131A48',
    fontFamily: 'inherit',
    marginBottom: '0.9rem'
  },
  rootHover: {
    border: '2px solid #FF5800',
    background: '#fff5ee'
  },
  label: {
    fontWeight: 700,
    color: '#FF5800',
    fontSize: 14,
    letterSpacing: '0.03em',
    marginBottom: 4,
    display: 'block'
  },
  desc: {
    fontSize: 12,
    color: '#888',
    marginBottom: 7
  },
  btn: {
    background: '#FF5800',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '0.55rem 1.15rem',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginTop: 8,
    display: 'inline-block'
  },
  error: {
    color: '#d32f2f',
    marginTop: '0.8rem',
    fontSize: 12
  }
}

export default function PdfUploader({
  label = 'invoice.pdf',
  description = 'Upload your purchase invoice PDF',
  onCartReplace,
  hasData = false,
  fileName = ''
}) {
  const inputRef = useRef(null)
  const [hover, setHover] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadPdfJS = () => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) return resolve(window.pdfjsLib)
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js'
      script.onload = () => {
        const pdfjsLib = window['pdfjs-dist/build/pdf']
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'
        window.pdfjsLib = pdfjsLib
        resolve(pdfjsLib)
      }
      script.onerror = () => reject(new Error('Failed to load PDF engine dependency.'))
      document.head.appendChild(script)
    })
  }

  async function handleFile(e) {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const pdfjsLib = await loadPdfJS()
      const reader = new FileReader()
      
      reader.onload = async function(ev) {
        try {
          const typedArray = new Uint8Array(ev.target.result)
          const loadingTask = pdfjsLib.getDocument({ data: typedArray })
          const pdf = await loadingTask.promise
          let textAll = ''

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const content = await page.getTextContent()
            const pageText = content.items.map((item) => item.str).join(' ')
            textAll += pageText + ' \n '
          }

          // Force formatting spacing flags
          let txt = textAll.replace(/\s+/g, ' ')
          const items = []

          // Isolate the catalog content safely
          const itemSectionRegex = /Items Purchased:(.*?)(?:Subtotal:|Grand Total:|$)/i
          const sectionMatch = txt.match(itemSectionRegex)
          const targetString = sectionMatch ? sectionMatch[1] : txt

          // Universal capture matching segment: splits out descriptive string followed by currency block
          const entryMatches = targetString.matchAll(/([A-Za-z0-9\s\-\(\)]+?)\s*Rs\.\s*([\d,]+)/g)
          let idCounter = 1

          for (const match of entryMatches) {
            const descriptionStr = match[1].trim()
            const rawPrice = match[2].replace(/[^0-9]/g, '')
            const basePrice = parseInt(rawPrice, 10) || 0

            // Skip divider line symbols or total items parsed by accident
            if (basePrice > 0 && descriptionStr.length > 3 && !descriptionStr.toLowerCase().includes('total')) {
              // Strip decorative characters out of the item title string
              const cleanDescription = descriptionStr.replace(/^[\s\-\.\=\*]+|[\s\-\.\=\*]+$/g, '').trim()
              const textTokens = cleanDescription.split(/\s+/)

              let platform = 'Direct Invoice'
              if (cleanDescription.toLowerCase().includes('amazon')) platform = 'Amazon'
              if (cleanDescription.toLowerCase().includes('flipkart')) platform = 'Flipkart'
              if (cleanDescription.toLowerCase().includes('ajio')) platform = 'Ajio'

              // Simple structural column layout lookup
              let brand = 'Generic'
              if (textTokens.length >= 2) {
                const filteredTokens = textTokens.filter(t => !['amazon', 'flipkart', 'ajio', 'direct'].includes(t.toLowerCase()))
                if (filteredTokens.length > 0) {
                  brand = filteredTokens[filteredTokens.length - 1]
                }
              }

              items.push({
                itemId: `INV-LINE-${idCounter++}`,
                product: cleanDescription,
                brand: brand,
                platform: platform,
                basePrice: basePrice
              })
            }
          }

          if (items.length > 0) {
            onCartReplace(items, file.name)
          } else {
            setError('Could not map data layout. Ensure text data contains recognizable descriptions and prices.')
          }
        } catch (err) {
          console.error(err)
          setError('Failed to extract matching line data out of this document.')
        } finally {
          setLoading(false)
        }
      }
      reader.readAsArrayBuffer(file)
    } catch (err) {
      console.error(err)
      setError('Failed initializing parser engine.')
      setLoading(false)
    } finally {
      e.target.value = ''
    }
  }

  const currentRootStyle = {
    ...S.root,
    border: hasData ? '2px dashed #1e5c2c' : (hover ? S.rootHover.border : S.root.border),
    background: hasData ? '#f0faf2' : (hover ? S.rootHover.background : S.root.background)
  }

  return (
    <div
      style={currentRootStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => !loading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={handleFile}
        onClick={(e) => e.stopPropagation()}
      />
      
      <span style={{ fontSize: 24, display: 'block', marginBottom: 4 }}>
        {hasData ? '📄' : '📥'}
      </span>
      
      <span style={S.label}>{label}</span>
      <div style={S.desc}>{hasData ? `Loaded Invoice: ${fileName}` : description}</div>

      <div style={S.btn}>
        {loading ? 'Reading Invoice...' : hasData ? 'Replace Invoice' : 'Upload Invoice'}
      </div>

      {error && <div style={S.error}>❌ {error}</div>}
    </div>
  )
}