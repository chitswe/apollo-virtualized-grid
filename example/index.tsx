import * as React from "react";
import * as ReactDOM from "react-dom";
import {  } from "@apollo/client/react/components";
import CssBaseline from "@material-ui/core/CssBaseline";
import {ApolloClient, InMemoryCache, HttpLink, ApolloProvider} from "@apollo/client";
import Component from "./Component";
import introspectionQueryResultData from "./fragmentTypes.json";
import secret from "./secret.json";
import { createMuiTheme } from "@material-ui/core";
import {ThemeProvider} from "@material-ui/styles";

const authFetch = (input: RequestInfo, init?: RequestInit) => {
  init.headers = {
    ...init.headers,
    Authorization: `Bearer ${secret.githubUserToken}`
  };
  return fetch(input, init);
};


const apolloClient = new ApolloClient({
  connectToDevTools: true,
  ssrMode: false,
  cache: new InMemoryCache({  }).restore(
    window.__APOLLO_STATE__
  ),
  link: new HttpLink({
    uri: "https://api.github.com/graphql",
    fetch: authFetch
  })
});
const theme = createMuiTheme({
  palette: {
    type: "dark"
  }
});
const Root = () => (
  <ApolloProvider client={apolloClient}>
    <ThemeProvider theme={theme}>
      <React.Fragment>
        <CssBaseline />
        <Component />
      </React.Fragment>
    </ThemeProvider>
  </ApolloProvider>
);

ReactDOM.render(<Root />, document.querySelector("#root"));
