---
title: User Authentication with Next.js
date: 2019-02-20 00:00:00 Z
tags:
- JavaScript
- React
- Next.js 
layout: post
image: '/public/img/using-internet.png'
author: Juan Olvera
twitter: _jolvera
summary: "User authentication with Next.js has been one of the most requested examples by the community. [The GitHub issue](https://github.com/zeit/next.js/issues/153) had more than 300 likes and hundreds of comments with recommendations and proposals."
---

User authentication with Next.js has been one of the most requested examples by the community. [The GitHub issue](https://github.com/zeit/next.js/issues/153) had more than 300 likes and hundreds of comments with recommendations and proposals. 

The issue asked the community to contribute an example with certain requirements:

- re-usable authentication helper across pages
- session synchronization among tabs
- simple passwordless email backend hosted on `now.sh`

The primary purpose of this example was to have a starting point for newcomers. 

With the release of [Next.js 8](https://nextjs.org/blog/next-8/) an example was finally accepted and merged into the [examples repository](https://github.com/zeit/next.js/tree/canary/examples/with-cookie-auth). In this post, we will create the example from scratch.

_You can find the code in the [Next.js examples repository](https://github.com/zeit/next.js/tree/canary/examples/with-cookie-auth) or play with the [working demo deployed in Now](https://nextjs-with-cookie-auth.now.sh) 2._

- <a href="#project-setup">Project Setup</a>
- <a href="#backend">Backend</a>
- <a href="#frontend">Frontend</a>
  - <a href="#login-page-and-authentication">Login Page and Authentication</a>
  - <a href="#profile-page-and-authorization">Profile Page and Authorization</a>
    - <a href="#authorization-helper-function">Authorization Helper Function</a>
    - <a href="#authorization-high-order-component">Authorization High Order Component</a>
    - <a href="#page-component-with-authorized-requests">Page Component with Authorized requests</a>
  - <a href="#logout-and-session-synchronization">Logout and Session Synchronization</a>
- <a href="#deploy-to-now-2">Deploy to Now 2</a>
- <a href="#local-development">Local Development</a>
- <a href="#conclusion">Conclusion</a>

## <span id="project-setup" class="anchor-target"></span><a href="#project-setup" class="anchor-link">Project setup</a>

We'll set up the project as a [monorepo](https://zeit.co/examples/monorepo/) with the recommended folder structure along with a `now.json` file so that we can deploy it to Now.

```bash
$ mkdir project
$ cd project
$ mkdir www api
$ touch now.json
```

## <span id="backend" class="anchor-target"></span><a href="#backend" class="anchor-link">Backend</a>

We will use `micro` to handle our incoming requests and `isomoprhic-unfetch` to make our outoing API requests.

```bash
$ cd api
$ npm install isomorphic-unfetch micro --save
```

To simplify our example, we'll use the GitHub API as a passwordless backend. Our backend will call the `/users/:username` endpoint and retrieve the users’ `id`, then from now on, this `id` will be our token.

In our app, we'll create two functions that will work as endpoints: `login.js` to return a token, and `profile.js` to return the user information from a given token.

```js
// api/login.js

const { json, send, createError, run } = require('micro')
const fetch = require('isomorphic-unfetch')

const login = async (req, res) => {
  const { username } = await json(req)
  const url = `https://api.github.com/users/${username}`

  try {
    const response = await fetch(url)
    if (response.ok) {
      const { id } = await response.json()
      send(res, 200, { token: id })
    } else {
      send(res, response.status, response.statusText)
    }
  } catch (error) {
    throw createError(error.statusCode, error.statusText)
  }
}

module.exports = (req, res) => run(req, res, login);
```

```js
// api/profile.js

const { send, createError, run } = require('micro')
const fetch = require('isomorphic-unfetch')

const profile = async (req, res) => {
  if (!('authorization' in req.headers)) {
    throw createError(401, 'Authorization header missing')
  }

  const auth = await req.headers.authorization
  const { token } = JSON.parse(auth)
  const url = `https://api.github.com/user/${token}`

  try {
    const response = await fetch(url)

    if (response.ok) {
      const js = await response.json()
      // Need camelcase in the frontend
      const data = Object.assign({}, { avatarUrl: js.avatar_url }, js)
      send(res, 200, { data })
    } else {
      send(res, response.status, response.statusText)
    }
  } catch (error) {
    throw createError(error.statusCode, error.statusText)
  }
}

module.exports = (req, res) => run(req, res, profile)
```

With this, we have everything we need to handle our simplified Authentication/Authorization strategy in the backend.


## <span id="frontend" class="anchor-target"></span><a href="#frontend" class="anchor-link">Frontend</a>

Now, inside our `www/` folder, we need to install our Next.js app and dependencies,

```bash
$ cd www/
$ npm create-next-app .
$ npm install
$ npm install isomorphic-unfetch next-cookies js-cookie --save
```

create our pages,

```bash
$ touch pages/index.js
$ touch pages/profile.js
```

the file that will contain our authentication helpers,

```bash
$ mkdir utils
$ touch utils/auth.js
```

and the file that will contain our custom server for local development. We'll need this later to replicate the monorepo setup locally.

```bash
$ touch server.js
```

At this point, our `www/` folder structure should look like this.

```
.
├── components
│   ├── header.js
│   └── layout.js
├── package-lock.json
├── package.json
├── pages
│   ├── index.js
│   ├── login.js
│   └── profile.js
├── server.js
└── utils
    └── auth.js
```

Our frontend structure is ready.


### <span id="login-page-and-authentication" class="anchor-target"></span><a href="#login-page-and-authentication" class="anchor-link">Login Page and Authentication</a>

The login page will contain the form that will authenticate our users. The form will send a POST request to the `/api/login.js` endpoint with a username, then if the username exists the backend will return a token.

For this example, as long as we keep this token in the frontend, we can say that the user has an active session.

```jsx
// www/pages/login.js

import { Component } from 'react'
import fetch from 'isomorphic-unfetch'
import Layout from '../components/layout'
import { login } from '../utils/auth'

class Login extends Component {
  static getInitialProps ({ req }) {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'

    const apiUrl = process.browser
      ? `${protocol}://${window.location.host}/api/login.js`
      : `${protocol}://${req.headers.host}/api/login.js`

    return { apiUrl }
  }

  constructor (props) {
    super(props)

    this.state = { username: '', error: '' }
    this.handleChange = this.handleChange.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleChange (event) {
    this.setState({ username: event.target.value })
  }

  async handleSubmit (event) {
    event.preventDefault()
    const username = this.state.username
    const url = this.props.apiUrl

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      if (response.ok) {
        const { token } = await response.json()
        login({ token })
      } else {
        console.log('Login failed.')
        // https://github.com/developit/unfetch#caveats
        let error = new Error(response.statusText)
        error.response = response
        return Promise.reject(error)
      }
    } catch (error) {
      console.error(
        'You have an error in your code or there are Network issues.',
        error
      )
      throw new Error(error)
    }
  }

  render () {
    return (
      <Layout>
        <div className='login'>
          <form onSubmit={this.handleSubmit}>
            <label htmlFor='username'>GitHub username</label>

            <input
              type='text'
              id='username'
              name='username'
              value={this.state.username}
              onChange={this.handleChange}
            />

            <button type='submit'>Login</button>

            <p className={`error ${this.state.error && 'show'}`}>
              {this.state.error && `Error: ${this.state.error}`}
            </p>
          </form>
        </div>
        <style jsx>{`
          .login {
            max-width: 340px;
            margin: 0 auto;
            padding: 1rem;
            border: 1px solid #ccc;
            border-radius: 4px;
          }
          form {
            display: flex;
            flex-flow: column;
          }
          label {
            font-weight: 600;
          }
          input {
            padding: 8px;
            margin: 0.3rem 0 1rem;
            border: 1px solid #ccc;
            border-radius: 4px;
          }
          .error {
            margin: 0.5rem 0 0;
            display: none;
            color: brown;
          }
          .error.show {
            display: block;
          }
        `}</style>
      </Layout>
    )
  }
}

export default Login
```

Our `getInitialProps()` will generate a URL based on the environment we are and by checking if we are in the browser or the server.

The first line will set the protocol to `https` or `https` depending on the environment.

```js
...
const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
...
```

Next, we get our `host` depending on whether we are in the browser or the server. This way, we will get the right URL even if we are in Now with a dynamically generated URL or in our local development using `http://localhost:3000`.

```js
...
const apiUrl = process.browser
  ? `${protocol}://${window.location.host}/${endpoint}`
  : `${protocol}://${req.headers.host}/${endpoint}`;
...
```

Everything else is pretty standard with a form that makes a POST request on submission. We also use the local state to handle our simple validation error messages.

If our request is successful, we'll log in our user by saving the cookie with the token we got from the API, and redirect the user to our profile page.

```js
...
cookie.set("token", token, { expires: 1 });
Router.push("/profile")
...
```


### <span id="profile-page-and-authorization" class="anchor-target"></span><a href="#profile-page-and-authorization" class="anchor-link">Profile Page and Authorization</a>

With client-only SPAs, to Authenticate or Authorize a user, we have to let them request the page, load the JavaScript and then send a request to the server to verify the user’s session. Fortunately, Next.js gives us SSR, and we can check the user’s session on the server using `getInitialProps();`.

#### <span id="authorization-helper-function" class="anchor-target"></span><a href="#authorization-helper-function" class="anchor-link">Authorization Helper Function</a>

Before creating our profile page, we'll create a helper function in `www/utils/auth.js` that will restrict access to Authorized users.

```js
// www/utils/auth.js

import Router from 'next/router'
import nextCookie from 'next-cookies'

export const auth = ctx => {
  const { token } = nextCookie(ctx)

  if (ctx.req && !token) {
    ctx.res.writeHead(302, { Location: '/login' })
    ctx.res.end()
    return
  }

  if (!token) {
    Router.push('/login')
  }

  return token
}
```

When a user loads the page, the function will try to get the token from the cookie using `nextCookie`, then if the session is invalid it will redirect the browser to the login page, otherwise Next.js will render the page normally.

```js
// Implementation example
...
Profile.getInitialProps = async ctx => {
  // Check user's session
  const { token } = auth(ctx);

  return { token }
}
...
```

This helper is simple enough for our example and works on the server and the client. Optimally, we want to restrict access on the server, so we don't load unnecessary resources.

#### <span id="authorization-high-order-component"></span><a href="#authorization-high-order-component" class="anchor-link">Authorization High Order Component</a>

Another way to abstract this, is using a HOC that we can use in our restricted pages like Profile. We could use it like this:

```jsx
import { withAuthSync } from '../utils/auth'

const Profile = props =>
  <div>If you can see this, you are logged in.</div>

export default withAuthSync(Profile)
```

Also, it will be useful later for our loggout functionality. Like so, we write our HOC the standard way and include our `auth` helper function to take care of the Authorization.

We create our HOC in our `auth.js` file as well.

```jsx
// Gets the display name of a JSX component for dev tools
const getDisplayName = Component =>
  Component.displayName || Component.name || 'Component'

export const withAuthSync = WrappedComponent =>
  class extends Component {
    static displayName = `withAuthSync(${getDisplayName(WrappedComponent)})`

    static async getInitialProps (ctx) {
      const token = auth(ctx)

      const componentProps =
        WrappedComponent.getInitialProps &&
        (await WrappedComponent.getInitialProps(ctx))

      return { ...componentProps, token }
    }

    render () {
      return <WrappedComponent {...this.props} />
    }
}
```

#### <span id="page-component-with-authorized-requests" class="anchor-target"></span><a href="#page-component-with-authorized-requests" class="anchor-link">Page Component with Authorized requests</a>

Our profile page will show our GitHub avatar, name and bio. To pull this data from our API, we need to send an Authorized request. Our API will throw an error if the session is invalid and if so we will redirect our user to the login page.

With this, we create our restricted profile page with the authorized API calls.

```jsx
// www/pages/profile.js

import Router from 'next/router'
import fetch from 'isomorphic-unfetch'
import nextCookie from 'next-cookies'
import Layout from '../components/layout'
import { withAuthSync } from '../utils/auth'

const Profile = props => {
  const { name, login, bio, avatarUrl } = props.data

  return (
    <Layout>
      <img src={avatarUrl} alt='Avatar' />
      <h1>{name}</h1>
      <p className='lead'>{login}</p>
      <p>{bio}</p>

      <style jsx>{`
        img {
          max-width: 200px;
          border-radius: 0.5rem;
        }
        h1 {
          margin-bottom: 0;
        }
        .lead {
          margin-top: 0;
          font-size: 1.5rem;
          font-weight: 300;
          color: #666;
        }
        p {
          color: #6a737d;
        }
      `}</style>
    </Layout>
  )
}

Profile.getInitialProps = async ctx => {
  // We use `nextCookie` to get the cookie and pass the token to the
  // frontend in the `props`.
  const { token } = nextCookie(ctx)
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'

  const apiUrl = process.browser
    ? `${protocol}://${window.location.host}/api/profile.js`
    : `${protocol}://${ctx.req.headers.host}/api/profile.js`

  const redirectOnError = () =>
    process.browser
      ? Router.push('/login')
      : ctx.res.writeHead(301, { Location: '/login' })

  try {
    const response = await fetch(apiUrl, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: JSON.stringify({ token })
      }
    })

    if (response.ok) {
      return await response.json()
    } else {
      // https://github.com/developit/unfetch#caveats
      return redirectOnError()
    }
  } catch (error) {
    // Implementation or Network error
    return redirectOnError()
  }
}

export default withAuthSync(Profile)
```

We send our `GET` request to our API with the `credentials: "include"` option to make sure our header `Authorization` is sent with our token in it. With this, we make sure our API gets what it needs to authorize our request and return the data.

### <span id="logout-and-session-synchronization" class="anchor-target"><a href="#logout-and-session-synchronization" class="anchor-link">Logout and Session Synchronization</a>

In our frontend, to log out the user, we need to clear the cookie and redirect the user to the login page. We add a function in our `auth.js` file to do so.

```js
// www/auth.js

import cookie from "js-cookie";
import Router from "next/router";

export const logout = () => {
  cookie.remove("token");
  Router.push("/login");
};
```

Every time we need to log out our user we call this function, and it should take care of it. However, one of the requirements was session synchronization, that means that if we log out the user, it should do it from all the browser tabs/windows. To do this we need to listen to a global event listener, but instead of setting something like a custom event we will use [storage event](https://developer.mozilla.org/en-US/docs/Web/Events/storage).

To make it work we would have to add the event listener to all the restricted pages `componentDidMount` method, so instead of doing it manually, we'll include it in our [withAuthSync HOC](https://reactjs.org/docs/higher-order-components.html).


```jsx
// www/utils/auth.js

// Gets the display name of a JSX component for dev tools
const getDisplayName = Component =>
  Component.displayName || Component.name || 'Component'

export const withAuthSync = WrappedComponent =>
  class extends Component {
    static displayName = `withAuthSync(${getDisplayName(WrappedComponent)})`

    static async getInitialProps (ctx) {
      const token = auth(ctx)

      const componentProps =
        WrappedComponent.getInitialProps &&
        (await WrappedComponent.getInitialProps(ctx))

      return { ...componentProps, token }
    }

    // New: We bind our methods
    constructor (props) {
      super(props)

      this.syncLogout = this.syncLogout.bind(this)
    }

    // New: Add event listener when a restricted Page Component mounts
    componentDidMount () {
      window.addEventListener('storage', this.syncLogout)
    }

    // New: Remove event listener when the Component unmount and
    // delete all data
    componentWillUnmount () {
      window.removeEventListener('storage', this.syncLogout)
      window.localStorage.removeItem('logout')
    }

    // New: Method to redirect the user when the event is called
    syncLogout (event) {
      if (event.key === 'logout') {
        console.log('logged out from storage!')
        Router.push('/login')
      }
    }

    render () {
      return <WrappedComponent {...this.props} />
    }
}
```

Then, we add the event that will trigger the log out on all windows to our `logout` function.

```js
// www/utils/auth.js

import cookie from "js-cookie";
import Router from "next/router";

export const logout = () => {
  cookie.remove("token");
  // To trigger the event listener we save some random data into the `logout` key
  window.localStorage.setItem("logout", Date.now()); // new
  Router.push("/login");
};
```

Finally, because we added this functionality to our Authentication/Authorization HOC, we don't need to change anything in our Profile page.

Now, every time our user logs out, the session will be synchronized across all windows/tabs.

## <span id="deploy-to-now-2" class="anchor-target"></span><a href="#deploy-to-now-2" class="anchor-link">Deploy to Now 2</a>

The only thing left is to write our configuration in our `now.json` file.

```js
// now.json

{
  "version": 2,
  "name": "cookie-auth-nextjs", //
  "builds": [
    { "src": "www/package.json", "use": "@now/next" },
    { "src": "api/*.js", "use": "@now/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/www/$1" }
  ]
}
```

The configuration file tells Now how to route our requests and what builders to use. You can read more about it in the [Deployment Configuration (now.json)](https://zeit.co/docs/v2/deployments/configuration) page.

## <span id="local-development" class="anchor-target"><a href="#local-development" class="anchor-link">Local Development</a>

In our API, the functions `profile.js` and `login.js` work correctly as [lambdas](https://zeit.co/docs/v2/deployments/concepts/lambdas/) when they are deployed in Now 2, but we can’t work with them locally as they are right now.

We can use them locally by importing the functions into a small server using basic routing. To accomplish this, we create a third file called `dev.js` that we'll use for local development only and install `micro-dev` as a development dependency.

```bash
$ cd api
$ touch dev.js
$ npm install micro-dev --save-dev
```

```js
// api/dev.js

const { run, send } = require("micro");
const login = require("./login");
const profile = require("./profile");

const dev = async (req, res) => {
  switch (req.url) {
    case "/api/profile.js":
      await profile(req, res);
      break;
    case "/api/login.js":
      await login(req, res);
      break;

    default:
      send(res, 404, "404. Not found.");
      break;
  }
};

exports.default = (req, res) => run(req, res, dev);
```

The server will return the functions when a specific URLs is requested, this is a bit unconventional for routing, but it works for our example.

Then, in our frontend, we'll use a custom server for our Next.js app that will proxy certain requests to our API server. For this, we'll use `http-proxy` as a development dependency,

```bash
$ cd www
$ npm install http-proxy --save-dev
```

```js
// www/server.js

const { createServer } = require("http");
const httpProxy = require("http-proxy");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const proxy = httpProxy.createProxyServer();
const target = "http://localhost:3001";

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname, query } = parsedUrl;

    switch (pathname) {
      case "/":
        app.render(req, res, "/", query);
        break;

      case "/login":
        app.render(req, res, "/login", query);
        break;

      case "/api/login.js":
        proxy.web(req, res, { target }, error => {
          console.log("Error!", error);
        });
        break;

      case "/profile":
        app.render(req, res, "/profile", query);
        break;

      case "/api/profile.js":
        proxy.web(req, res, { target }, error => console.log("Error!", error));
        break;

      default:
        handle(req, res, parsedUrl);
        break;
    }
  }).listen(3000, err => {
    if (err) throw err;
    console.log("> Ready on http://localhost:3000");
  });
});
```

and the last step is to modify our `package.json` to run our custom server with `npm run dev`.

```js
// www/package.json

...
 "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "next start"
},
...
```

With this setup we can deploy it to Now 2 running `now` at the root folder or use it locally running `micro-dev dev.js -p 3001` inside the `api/` folder and `npm run dev` inside the `www/` folder.

## <span id="conclusion" class="anchor-target"></span><a href="#conclusion" class="anchor-link">Conclusion</a>

This example is the result of going through the issue comments, proposals, code examples, blog posts, and existing implementations and extracting the best parts of each one. 

The example ended being a minimal representation of how Authentication should work in the Frontend using Next.js, leaving out features you might need in a real-world implementation and third-party libraries that were strongly recommended like Redux and Apollo (with GraphQL). Also, the example is backend agnostic, making it easy to use with any language in the server.

Finally, one of the many discussions was whether to use `localStorage` or cookies. The example uses cookies so we can share the token between the server and the client.