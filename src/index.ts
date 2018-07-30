import { attachComponent } from './component'
import { iter, MIN_INT, raf } from './utils'

const $app = document.getElementById('app')

if (!$app) {
  throw new Error('No #app node.')
}

;(() => {
  const attachNodes = (nodes: any[]) =>
    iter(nodes, (node: HTMLElement) => {
      switch (node.nodeType) {
        case 1:
          const $childNodes = [].slice.call(node.getElementsByClassName('gc'))

          if (node.classList.contains('gc')) {
            attachComponent(node, {
              count: 0
            })
          } else if ($childNodes.length) {
            attachNodes($childNodes)
          }

          break
      }
    })

  const $header = document.querySelector('header')
  const $count = $header && $header.querySelector('span')
  const $nodes = document.getElementsByClassName('gc')
  const $tmp = $nodes[0].cloneNode(true)

  attachNodes([].slice.call($nodes))

  new MutationObserver(mutations => {
    iter(mutations, (mut: MutationRecord) => {
      if (mut.type === 'childList') {
        const nodes = [].slice.call(mut.addedNodes).filter((n: HTMLElement) => n.nodeType === 1)

        if (nodes.length) {
          attachNodes(nodes)
        }

        raf(() => {
          const $frag = document.createDocumentFragment()
          $frag.appendChild(document.createTextNode($app.children.length.toString()))

          if ($count) {
            $count.children[0].replaceChild($frag, $count.children[0].childNodes[0])
          }
        })
      }
    })
  }).observe($app, { childList: true, subtree: true })

  // ----------------------------------------------

  let stm: number
  window.addEventListener('scroll', () =>
    raf(() => {
      document.body.style.pointerEvents = 'none'

      clearTimeout(stm)
      stm = setTimeout(() => (document.body.style.pointerEvents = ''), 350)
    })
  )

  if ($header) {
    const $add = $header.children[0]
    const $remove = $add.nextElementSibling

    document.body.addEventListener('mousedown', e => {
      const target = e.target as HTMLElement

      if (target === $add || target === $remove) {
        const num: any = target.dataset.num

        if (target === $add) {
          const $frag = document.createDocumentFragment()
          const $div = $tmp.cloneNode(true) as HTMLElement

          iter([...Array(num | 0)], () => $frag.appendChild($div.cloneNode(true)))
          raf(() => $app.appendChild($frag.cloneNode(true)))
        } else {
          iter(MIN_INT(num | 0, $app.children.length), () =>
            raf(() => $app.lastElementChild && $app.removeChild($app.lastElementChild), false)
          )
        }
      }
    })
  }

  const $textarea = document.querySelector('textarea')

  if ($textarea) {
    $textarea.addEventListener('focus', () => {
      const $note = $textarea.nextElementSibling

      $textarea.select()
      new Promise(resolve => {
        resolve(document.execCommand.call(document, 'Copy'))
      }).then(() => $note && ($note.innerHTML = 'Copied!'))

      $textarea.addEventListener('blur', () => $note && ($note.innerHTML = '&nbsp;'), { once: true })
    })
  }
})()
