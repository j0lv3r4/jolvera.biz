---
layout: post
title: How I organize my Sass projects
tag: Sass 
author: Juan Olvera
twitter: thinkxl
---

This is a basic writing on how I organize my Sass projects, mostly for self documentation.

I have two structures; mid and small-size projects. I work mostly for small business, so there is no need to over engineer my Sass code. 

### Small projects

{% highlight bash %}
plugins/
  |-- _colorpicker.scss
  |-- _normalize.scss
utils/
  |-- _functions.scss # All mixins, functions, extends, etc.
base/
  |-- _base.scss # Base, typography and forms.
components/ # Micro components.
  |-- _buttons.scss
  |-- _dropdown.scss
  |-- _navigation.scss
layout/ # Macro components.
  |-- _grid.scss
  |-- _layout.scss # Header, container, footer, etc.
  |-- _sidebar.scss
pages/ # Specific pages styles.
  |-- _pages.scss # Home, contact, etc.
todo.scss # Styles that I can organize later.
main.scss # The manifest.
{% endhighlight %}
 
### Mid-size projects

{% highlight bash %}
plugins/ 
  |-- _colorpicker.scss
  |-- _normalize.scss
utils/
  |-- _extends.scss
  |-- _functions.scss
  |-- _mixins.scss
  |-- _variables.scss
base/
  |-- _base.scss
  |-- _forms.scss
  |-- _typography.scss
components/ # Micro components.
  |-- _buttons.scss
  |-- _dropdown.scss
  |-- _feedback.scss
  |-- _navigation.scss
  |-- _tabs.scss
layout/ # Macro components.
  |-- _container.scss
  |-- _footer.scss
  |-- _grid.scss
  |-- _header.scss
  |-- _sidebar.scss
pages/ # Specific pages styles.
  |-- _contact.scss
  |-- _home.scss
todo.scss # Styles that I can organize later.
main.scss # The manifest.
{% endhighlight %}

In both structures I use the same folders and each one have their own purpose.

### `plugins/`

When I don't use [Bower](http://bower.co) for third party libraries, this is the folder where they go.

### `utils/`

Here are the files that have functions, mixins, extends, or classes that I use more than once in different folders.

Notice that if I use a mixin only once, I include it inside the file where is needed, for example I have a `button-generator` mixin that I only use on `_bottons.scss`, so I have it included in there only.

### `base/`

Core styles like `html`, `body`, `p` and `a` tags, also the `form` and `table`, for example. In other words, the foundation (not the framework) of the project.

### `components/`

Here are all the <abbr>UI</abbr> (User Interface) components that are required to use in the layout.

For example, we have the navigation that goes inside the header, or the buttons that goes almost on any part of the layout; header, main, footer, etc.

### `layout/`

Header, footer, sidebar and other elements that makes the site structure. 

As I mentioned before, the layouts are built with the help of the components. We can code the header using the `.site-logo`, `.site-navigation`, and `.social-icons` classes (from the `components/` folder) and make them work together inside the `_header.scss` file. 


### `pages/`

Page specific styles, for example: 

- `_home.scss` 
- `_contact-us.scss`
- `_portfolio-gallery.scss`

### `main.scss`

The manifesto that include all the files to render the `style.css`.
