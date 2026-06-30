import React, { useState } from 'react'

const S = {
  card: {
    padding: '1.2rem',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    fontFamily: 'inherit',
    marginBottom: '1rem'
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '15px',
    fontWeight: 700,
    color: '#131A48',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  textarea: {
    width: '100%',
    height: '75px',
    padding: '0.6rem',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    fontFamily: 'inherit',
    resize: 'none',
    boxSizing: 'border-box',
    marginBottom: '0.6rem',
    outline: 'none'
  },
  btn: {
    background: '#131A48',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '0.55rem 1.2rem',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s'
  },
  error: {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '0.5rem'
  },
  success: {
    color: '#16a34a',
    fontSize: '12px',
    marginTop: '0.5rem',
    fontWeight: 500
  }
}

export default function NaturalLanguageInput({ onAddRule }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ type: '', msg: '' })

  // Read your Groq key from your .env setup
  const API_KEY = import.meta.env.VITE_GROQ_API_KEY; 

  async function handleAiParse() {
    if (!text.trim()) return
    setLoading(true)
    setStatus({ type: '', msg: '' })

    try {
      // Direct fetch payload pointing to Groq's official v1/chat/completions endpoint
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // Fast, accurate default model
          response_format: { type: "json_object" }, // Enforces structural JSON mode output
          messages: [
            {
              role: "system",
              content: `You are an expert parsing assistant. You must convert a user's discount rule into a clean JSON object matching this schema exactly:
              {
                "scope": "Platform" or "Brand",
                "appliesTo": "Name of the brand or platform (e.g. Amazon, Flipkart, Lenovo, Featherlite)",
                "type": "Percentage" or "Flat",
                "value": number (raw integer discount value),
                "stackable": boolean (true or false)
              }
              Return ONLY the raw JSON object. No explanations or conversational text outside of the object keys.`
            },
            {
              role: "user",
              content: text
            }
          ]
        })
      })

      const data = await response.json()
      
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Groq connection endpoint failure.')
      }

      const rawJsonText = data?.choices?.[0]?.message?.content
      if (!rawJsonText) throw new Error('Empty context stream returned from Groq endpoint.')

      const parsedRule = JSON.parse(rawJsonText.trim())

      // Standardize data casings to fit your dashboard logic rules perfectly
      if (parsedRule.scope) {
        parsedRule.scope = parsedRule.scope.charAt(0).toUpperCase() + parsedRule.scope.slice(1).toLowerCase();
      }
      if (parsedRule.type) {
        parsedRule.type = parsedRule.type.charAt(0).toUpperCase() + parsedRule.type.slice(1).toLowerCase();
      }

      parsedRule.ruleId = `AI-${Math.floor(1000 + Math.random() * 9000)}`

      // Fire data state update up to the main table component
      onAddRule(parsedRule)
      
      setText('')
      setStatus({ 
        type: 'success', 
        msg: `🎉 Created ${parsedRule.ruleId}: Applied ${parsedRule.value}${parsedRule.type === 'Percentage' ? '%' : ' Rs'} off to ${parsedRule.appliesTo}!` 
      })

    } catch (err) {
      console.error(err)
      setStatus({ type: 'error', msg: 'Failed parsing rule with Groq. Check your .env setup or API key.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.card}>
      <h3 style={S.title}>🤖 Add AI Discount Rule</h3>
      <textarea
        style={S.textarea}
        placeholder="Type a rule (e.g., 'Take 120 rupees off on Lenovo products, stackable')"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={loading}
      />
      <button 
        style={{ ...S.btn, background: loading ? '#64748b' : '#131A48' }}
        onClick={handleAiParse}
        disabled={loading}
      >
        {loading ? 'AI Parsing...' : 'Generate AI Rule'}
      </button>

      {status.type === 'error' && <div style={S.error}>❌ {status.msg}</div>}
      {status.type === 'success' && <div style={S.success}>{status.msg}</div>}
    </div>
  )
}