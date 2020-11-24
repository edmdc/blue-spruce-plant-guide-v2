import fetch from 'cross-fetch';
import { HttpLink, ApolloLink } from '@apollo/client';
// import { setContext } from '@apollo/client/link/context';

const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql',
  fetch,
});

const authMiddleware = (authToken: string): ApolloLink =>
  new ApolloLink((operation, forward) => {
    if (authToken) {
      operation.setContext({
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
    }
    return forward(operation);
  });

export default [httpLink, authMiddleware];
