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
  const parts = baseStyles.split('}').filter(s => s)

  const $styles = document.createElement('style')

  $styles.appendChild(
    document.createTextNode(
      parts
        .reduce((acc, id) => {
          const p = id.split('{')

          if (/:/.test(p[0])) {
            const last = p[0].match(/(.*?)([^;]*?)$/)

            if (last[1] && last[2]) {
              acc += `.${className} { ${p[0].replace(last[2], '')} }`
              acc += `.${className} ::slotted(${last[2]}) { ${p[1]} }`
            }
          } else if (p[1]) {
            acc += `.${className} ::slotted(${p[0]}) { ${p[1]} }`
          }

          return acc
        }, '')
        .replace(/\s\s+/g, ' ')
    )
  )

  const cleanStyles = $styles.textContent.replace(new RegExp(`.${className} `, 'gm'), '')
  const noSlots = cleanStyles.replace(/::slotted\((.*?)\s+\)/gm, '$1')

  return inst => {
    $styles.id = `sc-${inst.displayName}`
    const $cache = document.getElementById($styles.id)

    if ($cache) {
      document.head.replaceChild($styles, $cache)
    } else {
      document.head.appendChild($styles)
    }

    Object.defineProperty(inst, 'styles', {
      writable: true,
      value: [...new Set((inst.styles || []).concat(cleanStyles).filter(a => a))]
    })

    if (!('setStyles' in inst)) {
      Object.defineProperty(inst, 'setStyles', {
        value: function() {
          const $sStyles = document.createElement('style')

          this.styles.forEach(s => $sStyles.appendChild(document.createTextNode(s)))
          this.shadowRoot.children[0].appendChild($sStyles)

          $styles.isConnected && document.head.removeChild($styles)
          this.styles = []
        }
      })
    }
  }
}
