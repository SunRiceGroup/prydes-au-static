'use strict';

const container = document.querySelector('#quiz');

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function button(label, action, className) {
  const control = element('button', label, className);
  control.type = 'button';
  control.addEventListener('click', action);
  return control;
}

async function startQuiz() {
  const response = await fetch('/feed-selector/assets/quiz-data.json');
  if (!response.ok) return;
  const quiz = await response.json();
  const history = [quiz.start];

  function render(focusHeading = true) {
    const node = quiz.nodes[history.at(-1)];
    const question = quiz.questions[node.question];
    const title = element('h1', question ? question.title : 'Recommended products');
    title.tabIndex = -1;
    container.replaceChildren(title);

    if (question) {
      const choices = element('div', null, 'quiz-choices');
      question.choices.forEach((label, index) => {
        choices.append(button(label, () => {
          history.push(node.next[index]);
          render();
        }));
      });
      container.append(choices);
    } else if (node.products.length) {
      container.append(element('p', 'View products for more information.'));
      const list = element('div', null, 'quiz-products');
      for (const id of node.products) {
        const product = quiz.products[id];
        const link = element('a', null, 'pr_recProduct');
        link.href = product.href;
        link.target = '_blank';
        link.rel = 'noopener';
        const image = element('img');
        image.src = product.image;
        image.alt = '';
        link.append(image, element('span', product.name));
        list.append(link);
      }
      container.append(list);
    } else {
      const contact = element('a', 'Contact Pryde’s for feed advice');
      contact.href = '/contact-us';
      contact.target = '_top';
      container.append(contact);
    }

    const controls = element('div', null, 'quiz-controls');
    if (history.length > 1) {
      controls.append(button('Previous', () => {
        history.pop();
        render();
      }));
    }
    if (!question) {
      controls.append(button('Restart', () => {
        history.length = 1;
        render();
      }));
    }
    container.append(controls);
    if (focusHeading) title.focus({preventScroll:true});
  }

  render(false);
}

startQuiz().catch(() => {});
