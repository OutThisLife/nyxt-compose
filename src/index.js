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
              console.log(attr, nv, ov)
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
          this.$el = this
          this.key = this.getAttribute('key') || Math.random()
          this.attachShadow({
            mode: 'open'
          })

          if (this.attributes) {
            ;[].slice.call(this.attributes).forEach(({ name, value }) => {
              if (name in this.props) {
                return
              }

              this.observedAttributes.push(name)
              this.updateProp(name, value)
            })
          }

          this.render().then(() => {
            this.setStyles()
            this.attachEvents()
          })
        }
      },

      render: {
        value: function() {
          const $clone = this.$el.cloneNode(true)
          const $template = document.createElement('template')
          const [$buf, out] = frag(output.call(this, this.props))

          $template.content.appendChild(document.createElement('div'))

          iterChildren($buf, $child => {
            iterVars($child, (v, prop) => {
              const [cbuf] = frag(v.replace(v, `<span slot="${prop}">${this.props[prop] || 'N/A'}</span>`))

              if ($child.nodeType === 3) {
                $child.parentNode.replaceChild(cbuf, $child)
              } else {
                $child.setAttribute('slot', prop)
                $child.innerText = $child.innerText.replace(v, this.props[prop] || 'N/A')
              }
            })

            if ($child.attributes) {
              ;[].slice
                .call($child.attributes)
                .forEach(n => iterVars(n, (v, prop) => (n.nodeValue = this.props[prop] || 'N/A')))
            }
          }).then(() => {
            console.log($buf.cloneNode(true))

            iterChildren(this.$el, $child => $child.parentNode.removeChild($child))
            iterChildren($buf.cloneNode(true), $child => this.$el.appendChild($child.cloneNode(true)))
          })

          iterChildren($clone.children[0], $child => {
            if ($child.hasAttribute('slot')) {
              const $slot = document.createElement('slot')
              const slotName = $child.getAttribute('slot')
              $slot.setAttribute('name', slotName)

              $template.content.firstChild.appendChild($slot)
            } else {
              $template.content.firstChild.appendChild($child.cloneNode(true))
            }
          }).then(() => this.shadowRoot.appendChild($template.content.cloneNode(true)))

          return new Promise(y => y(this))
        }
      },

      attachEvents: {
        value: function() {
          this.addEventListener('click', () => {
            this.props.increment.call(this, this.props.count + 1)
          })
        }
      }
    })

    const { displayName } = enhance(H_IMPL.prototype)

    if (displayName) {
      if (window.customElements.get(displayName)) {
        location.reload()
      }

      window.customElements.define(displayName, H_IMPL)
    }

    return H_IMPL
  })()

composeElement(
  {
    displayName: 'hello-world'
  },
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
  withProps(({ test = 15 }) => ({
    test
  }))
)(
  ({ name, age, rating, count }) => `
    <div>
      <h1 contenteditable>{name}</h1>
      <button>{count}</button>
      <p>{test}</p>
    </div>
  `
)
