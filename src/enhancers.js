export const withState = (name, fn, defaultValue) => (inst, props = inst.props) =>
  !(name in props)
    ? Object.defineProperties(inst, {
        observedAttributes: {
          value: [...new Set(inst.observedAttributes.concat(name).filter(a => a))]
        },

        props: Object.assign(props, {
          [name]: defaultValue,
          [fn]: function(v) {
            this.updateProp(name, v)
          }
        })
      })
    : inst

// --------------------------------------------------

export const withProps = cb => (inst, props = inst.props) =>
  Object.defineProperty(inst, 'props', {
    enumerable: true,
    configurable: true,
    value: Object.assign(props, cb(props))
  })

// --------------------------------------------------

export const onlyUpdateForKeys = (value = []) => inst =>
  Object.defineProperty(inst, 'observedAttributes', {
    value
  })

// --------------------------------------------------

export const pure = props => inst =>
  Object.defineProperty(inst, 'shouldUpdate', {
    enumerable: true,
    configurable: true,
    value: inst.shouldUpdate.concat((attr, nv, ov) => !shallowEqual(ov, nv))
  })

// --------------------------------------------------

export const styled = baseStyles => {
  const className = btoa(Math.random()).substr(5, 5)
  const id = `sc-${className}`
  const parts = baseStyles.split('}').filter(s => s)

  const $styles = document.createElement('style')
  $styles.type = 'text/css'
  $styles.id = id

  $styles.appendChild(
    document.createTextNode(
      parts
        .reduce((acc, id) => {
          const p = id.split('{')

          if (/:/.test(p[0])) {
            const last = p[0].match(/(.*?)([^;]*?)$/)

            if (last[1] && last[2]) {
              acc += `.${className} { ${p[0].replace(last[2], '')} }`
              acc += `.${className} ${last[2]}{ ${p[1]} }`
            }
          } else if (p[1]) {
            acc += `.${className} ${p[0]}{ ${p[1]} }`
          }

          return acc
        }, '')
        .replace(/\s\s+/g, ' ')
    )
  )

  const clean = $styles.textContent.replace(new RegExp(`.${className} `, 'g'), '')

  document.head.appendChild($styles)

  return inst => {
    if (!('setStyles' in inst)) {
      Object.defineProperty(inst, 'setStyles', {
        value: function() {
          if (this.useShadow) {
            const $sStyles = document.createElement('style')
            $sStyles.type = 'text/css'

            this.styles.forEach(clean => $sStyles.appendChild(document.createTextNode(clean)))

            this.shadow.appendChild($sStyles)
            $styles.remove()
          } else {
            this.classList.add(className)
          }

          this.styles = []
        }
      })
    }

    Object.defineProperty(inst, 'styles', {
      writable: true,
      value: [...new Set((inst.styles || []).concat(clean).filter(a => a))]
    })
  }
}
