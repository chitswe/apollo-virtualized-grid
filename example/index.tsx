import * as React from "react";
import * as ReactDOM from "react-dom";
import { ApolloProvider, Query } from "react-apollo";
import CssBaseline from "@material-ui/core/CssBaseline";
import ApolloClient from "apollo-client";
import { InMemoryCache, IntrospectionFragmentMatcher } from "apollo-cache-inmemory";
import { HttpLink } from "apollo-link-http";
import gql from "graphql-tag";
import Component from "./Component";
import  introspectionQueryResultData from './fragmentTypes.json';
import  secret from "./secret.json";

const query = gql`
  query {
    search(first: 10, query: "virtualize", type: REPOSITORY) {
      repositoryCount
      pageInfo {
        hasNextPage
      }
      nodes {
        ...repo
      }
    }
  }

  fragment repo on RepositoryInfo {
    nameWithOwner
    description
    forkCount
    owner {
      id
      login
    }
  }
`;

const Home = () => (
  <Query query={query}>
    {({ data }) => {
      return <h1>{JSON.stringify(data)}</h1>;
    }}
  </Query>
);
const authFetch = (input: RequestInfo, init?: RequestInit) => {
  init.headers = { ...init.headers, Authorization: `Bearer ${secret.githubUserToken}` };
  return fetch(input, init);
};

const fragmentMatcher = new IntrospectionFragmentMatcher({
  introspectionQueryResultData
});
const apolloClient = new ApolloClient({
  connectToDevTools: true,
  ssrMode: false,
  cache: new InMemoryCache({fragmentMatcher}).restore(window.__APOLLO_STATE__),
  link: new HttpLink({
    uri: "https://api.github.com/graphql",
    fetch: authFetch
  })
});
const Root = () => (
  <ApolloProvider client={apolloClient}>
    <React.Fragment>
      <CssBaseline />
      <Component/>
    </React.Fragment>
  </ApolloProvider>
);

ReactDOM.render(<Root />, document.querySelector("#root"));
