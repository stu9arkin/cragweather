// js/searchView.js
import { searchCrags } from './logic/cragSearch.js';

export function initSearch({ crags, onSelect }) {
  const input = document.getElementById('search-input');
  const list = document.getElementById('search-results');

  let matches = [];
  let activeIndex = -1;

  function render() {
    list.replaceChildren();

    if (matches.length === 0) {
      const li = document.createElement('li');
      li.className = 'search-result search-result-empty';
      li.textContent = 'No matches';
      list.appendChild(li);
      return;
    }

    matches.forEach((crag, index) => {
      const li = document.createElement('li');
      li.className = index === activeIndex ? 'search-result active' : 'search-result';
      li.id = `search-result-${index}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'search-result-name';
      nameSpan.textContent = crag.name;

      const coordsSpan = document.createElement('span');
      coordsSpan.className = 'search-result-coords';
      coordsSpan.textContent = `${crag.lat.toFixed(2)}, ${crag.lon.toFixed(2)}`;

      li.appendChild(nameSpan);
      li.appendChild(coordsSpan);

      li.addEventListener('mousedown', (event) => {
        event.preventDefault();
        selectMatch(index);
      });
      list.appendChild(li);
    });
  }

  function open() {
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    matches = [];
    activeIndex = -1;
  }

  function selectMatch(index) {
    const crag = matches[index];
    if (!crag) return;
    input.value = crag.name;
    close();
    onSelect(crag);
  }

  function setActiveIndex(index) {
    if (matches.length === 0) return;
    activeIndex = Math.max(0, Math.min(index, matches.length - 1));
    render();
    input.setAttribute('aria-activedescendant', `search-result-${activeIndex}`);
    list.children[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  }

  input.addEventListener('input', () => {
    const query = input.value;
    if (query.trim().length === 0) {
      close();
      return;
    }
    matches = searchCrags(crags, query);
    activeIndex = -1;
    render();
    open();
  });

  input.addEventListener('keydown', (event) => {
    if (list.hidden) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(activeIndex - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectMatch(activeIndex === -1 ? 0 : activeIndex);
    } else if (event.key === 'Escape') {
      close();
    }
  });

  input.addEventListener('blur', () => {
    // Deferred so a mousedown on a result fires (and preventDefault()s the
    // blur-causing click) before the list actually closes.
    setTimeout(close, 0);
  });
}
