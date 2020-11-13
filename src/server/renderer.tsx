import path from 'path';
import React from 'react';
import express from 'express';
import { renderToString } from 'react-dom/server';
import { ChunkExtractor } from '@loadable/server';
import Helmet from 'react-helmet';
import { CacheProvider } from '@emotion/react';
import createEmotionServer from '@emotion/server/create-instance';
import createCache from '@emotion/cache';
import { ApolloProvider, ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client';
import App from '../client/modules/App';
import { StaticRouter } from 'react-router-dom';
import template from './template';
import fetch from 'cross-fetch';

type Context = {
  url?: string;
};

export default async function renderer(
  req: express.Request,
  res: express.Response,
): Promise<string | undefined> {
  const statsFile = path.resolve('dist/loadable-stats.json');
  const key = 'custom';
  const cache = createCache({ key });
  const { extractCritical } = createEmotionServer(cache);
  try {
    const extractor = new ChunkExtractor({
      statsFile,
      entrypoints: ['client', 'react-vendors'],
    });
    const apolloClient = new ApolloClient({
      ssrMode: true,
      link: createHttpLink({
        uri: 'http://localhost:8080',
        fetch,
      }),
      cache: new InMemoryCache(),
    });
    const context: Context = {};
    const Client = (
      <ApolloProvider client={apolloClient}>
        <CacheProvider value={cache}>
          <StaticRouter location={req.url} context={context}>
            <App />
          </StaticRouter>
        </CacheProvider>
      </ApolloProvider>
    );

    if (context.url) {
      res.writeHead(301, {
        Location: context.url,
      });
      res.end();
    } else {
      const jsx = extractor.collectChunks(Client);
      const initialState = apolloClient.extract();
      const { html, css, ids } = extractCritical(renderToString(jsx));
      const styleTag = `<style data-emotion="${key} ${ids.join(' ')}">${css}</style>`;
      const scriptTags = extractor.getScriptTags();

      const htmlHead = () => {
        const { title, meta } = Helmet.renderStatic();
        return title.toString() + meta.toString();
      };

      return template(htmlHead(), styleTag, html, scriptTags, JSON.stringify(initialState));
    }
  } catch (err) {
    if (err) {
      return err.message;
    }
  }
}