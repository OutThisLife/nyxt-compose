import { withProps, withState, onlyUpdateForKeys, pure, styled } from './enhancers'
import { shallowEqual, frag, iterChildren, iterVars } from './utils'

const composeElement = (...args) => output =>
  ((H = HTMLElement) => {
    function H_IMPL() {
      return Reflect.construct(H, [], this.constructor)
    }

    const enhance = proto =>
      args.reduce((acc, cb, idx) => {
        if (typeof cb === 'function') {
          cb(acc)
        } else if (typeof cb === 'object') {
          Object.assign(proto, cb)
        }

        return acc
      }, proto)

    Object.setPrototypeOf(H_IMPL.prototype, H.prototype)
    Object.defineProperties(H_IMPL.prototype, {
      useShadow: {
        writable: true,
        value: true
      },

      observedAttributes: {
        enumerable: true,
        writable: true,
        value: []
      },

      lastProps: {
        writable: true,
        value: {}
      },

      props: {
        enumerable: true,
        configurable: true,
        value: {}
      },

      updateProp: {
        value: function(attr, nv, ov = this.props[attr]) {
          return Promise.all(
            this.shouldUpdate.map(fn => new Promise((y, n) => (fn.call(this, attr, nv, ov) ? y() : n())))
          )
            .then(() => {
              this.lastProps = Object.assign({}, this.props)
              this.props[attr] = nv
              ;[].slice.call(this.$el.querySelectorAll(`[slot=${attr}]`)).forEach($slot => ($slot.innerText = nv))
            })
            .catch(e => {})
        }
      },

      shouldUpdate: {
        value: [
          function(attr) {
            return this.observedAttributes.includes(attr)
          }
        ]
      },

      connectedCallback: {
        value: function() {
          this.key = this.getAttribute('key') || Math.random()

          if (this.attributes) {
            ;[].slice.call(this.attributes).forEach(({ name, value }) => {
              if (name in this.props) {
                return
              }

              this.observedAttributes.push(name)
              this.updateProp(name, value)
            })
          }

          if (this.useShadow) {
            this.shadow = this.attachShadow({
              mode: 'open'
            })
          } else {
            this.setStyles()
          }

          this.$el = this.useShadow ? this.shadow : this
          this.render().then(this.attachEvents.bind(this))
        }
      },

      render: {
        value: function() {
          this.$template = document.createElement('template')

          iterChildren(this, $child => {
            if ($child.hasAttribute('slot')) {
              const $slot = document.createElement('slot')
              const slotName = $child.getAttribute('slot')
              $slot.setAttribute('name', slotName)

              if ($child.parentNode !== this.$el) {
                const $adj = this.querySelector(`[slot=${slotName}`)
                $adj.parentNode.replaceChild($slot, $adj)
              } else {
                this.$template.appendChild($slot)
              }
            } else {
              this.$template.appendChild($child.cloneNode(true))
            }
          }).then(() => this.$el.appendChild(this.$template.content.cloneNode(true)))

          const buf = frag(output.call(this, {}))

          iterChildren(buf, $child => {
            iterVars($child, (v, prop) => {
              const cbuf = frag(v.replace(v, `<span slot="${prop}">${this.props[prop] || 'N/A'}</span>`))

              if ($child.nodeType === 3) {
                $child.parentNode.replaceChild(cbuf, $child)
              } else {
                $child.innerText = $child.innerText.replace(v, '')
                $child.appendChild(cbuf)
              }
            })

            if ($child.attributes) {
              ;[].slice
                .call($child.attributes)
                .forEach(n => iterVars(n, (v, prop) => (n.nodeValue = this.props[prop] || 'N/A')))
            }
          }).then(() => this.$el.appendChild(buf))

          if (this.useShadow) {
            this.setStyles()
            // iterChildren(this, $child => $child.parentNode.removeChild($child))
          }

          return new Promise(y => y(this))
        }
      },

      attachEvents: {
        value: function() {
          this.$el.addEventListener('click', () => {
            this.props.increment.call(this, this.props.count + 1, this.props)
          })
        }
      }
    })

    enhance(H_IMPL.prototype)
    return H_IMPL
  })()

if (window.customElements.get('hello-world')) {
  location.reload()
}

window.customElements.define(
  'hello-world',
  composeElement(
    styled(`
    h1 { color: #f36; }
    p { color: blue; }
    button {
      padding: 1em 2em;
      background: #f36;
    }
  `),
    withState('count', 'increment', 1),
    withState('name', 'changeName', 'Hello World'),
    withProps(() => ({
      test: 15
    }))
  )(
    ({ name, age, rating, count }) => `
      <div>
        <h1 contenteditable>{name}</h1>
        <p>{test}</p>
        <button>{count}</button>
      </div>
    `
  )
)
