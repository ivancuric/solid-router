import { createRoot, createSignal } from "solid-js";
import { createRouterState } from "../src/routing";
import type { RouteUpdate } from "../src/types";
import { createAsyncRoot, createCounter, waitFor } from "./helpers";

describe("Router should", () => {
  describe("have member `base` which should", () => {
    test(`have a default path when base path is not defined`, () => {
      createRoot(() => {
        const signal = createSignal<RouteUpdate>({ value: "" });
        const { base } = createRouterState(signal, undefined);
        expect(base.path()).toBe("/");
      });
    });

    test(`have a normalized version of the base path when defined`, () => {
      createRoot(() => {
        const signal = createSignal<RouteUpdate>({ value: "" });
        const { base } = createRouterState(signal, "base");
        expect(base.path()).toBe("/base");
      });
    });

    test(`throw when the base path is invalid`, () => {
      createRoot(() => {
        const signal = createSignal<RouteUpdate>({ value: "" });
        expect(() => createRouterState(signal, "http://example.com")).toThrow();
      });
    });
  });

  describe("have member `location` which should", () => {
    test(`be initialized by the integration signal`, () => {
      createRoot(() => {
        const signal = createSignal<RouteUpdate>({
          value: "/foo/bar?hello=world"
        });
        const { location } = createRouterState(signal);
        expect(location.pathname).toBe("/foo/bar");
        expect(location.search).toBe("hello=world");
      });
    });

    describe(`contain property 'path' which should`, () => {
      test(`be reactive to the path part of the integration signal`, () =>
        createAsyncRoot(resolve => {
          const expected = "/fizz/buzz";
          const signal = createSignal<RouteUpdate>({
            value: "/foo/bar?hello=world"
          });
          const { location } = createRouterState(signal);
          expect(location.pathname).toBe("/foo/bar");
          signal[1]({ value: expected + "?hello=world" });

          waitFor(() => signal[0]().value === expected + "?hello=world").then(() => {
            expect(location.pathname).toBe(expected);
            resolve();
          });
        }));

      test(`ignore the queryString part of the integration signal`, () =>
        createRoot(() => {
          const signal = createSignal<RouteUpdate>({
            value: "/foo/bar?hello=world"
          });
          const { location } = createRouterState(signal);
          const count = createCounter(() => location.pathname);

          expect(location.pathname).toBe("/foo/bar");
          signal[1]({ value: "/foo/bar?fizz=buzz" });
          expect(location.pathname).toBe("/foo/bar");
          expect(count()).toBe(0);
        }));
    });
    describe(`contain propery 'queryString' which should`, () => {
      test(`be reactive to the queryString part of the integration signal`, () =>
        createAsyncRoot(resolve => {
          const expected = "fizz=buzz";
          const signal = createSignal<RouteUpdate>({
            value: "/foo/bar?hello=world"
          });
          const { location } = createRouterState(signal);

          expect(location.search).toBe("hello=world");
          signal[1]({ value: "/foo/baz?" + expected });

          waitFor(() => signal[0]().value === "/foo/baz?" + expected).then(() => {
            expect(location.search).toBe(expected);
            resolve();
          });
        }));

      test(`ignore the path part of the integration signal`, () =>
        createRoot(() => {
          const signal = createSignal<RouteUpdate>({
            value: "/foo/bar?hello=world"
          });
          const { location } = createRouterState(signal);
          const count = createCounter(() => location.search);

          expect(location.search).toBe("hello=world");
          signal[1]({ value: "/fizz/buzz?hello=world" });
          expect(location.search).toBe("hello=world");
          expect(count()).toBe(0);
        }));
    });

    describe("have member `query` which should", () => {
      test(`be parsed from location.search`, () => {
        createRoot(() => {
          const signal = createSignal<RouteUpdate>({
            value: "/foo/bar?hello=world&fizz=buzz"
          });
          const { location } = createRouterState(signal);
          expect(location.query.hello).toEqual("world");
          expect(location.query.fizz).toEqual("buzz");
        });
      });

      test(`be reactive to location.search`, () =>
        createAsyncRoot(resolve => {
          const signal = createSignal<RouteUpdate>({
            value: "/foo/bar?hello=world"
          });
          const { location } = createRouterState(signal);

          expect(location.query.hello).toEqual("world");
          signal[1]({ value: "/foo/bar?hello=world&fizz=buzz" });

          waitFor(() => signal[0]().value === "/foo/bar?hello=world&fizz=buzz").then(() => {
            expect(location.query.fizz).toEqual("buzz");
            resolve();
          });
        }));

      test(`have fine-grain reactivity`, () =>
        createAsyncRoot(resolve => {
          const signal = createSignal<RouteUpdate>({
            value: "/foo/bar?hello=world"
          });
          const { location } = createRouterState(signal);
          const count = createCounter(() => location.query.hello);

          expect(location.query.hello).toEqual("world");
          signal[1]({ value: "/foo/bar?hello=world&fizz=buzz" });

          waitFor(() => signal[0]().value === "/foo/bar?hello=world&fizz=buzz").then(() => {
            expect(location.query.fizz).toEqual("buzz");

            expect(count()).toBe(0);

            resolve();
          });
        }));

      test(`have properties which are reactive`, () =>
        createAsyncRoot(resolve => {
          const signal = createSignal<RouteUpdate>({
            value: "/foo/bar?hello=world"
          });
          const { location } = createRouterState(signal);
          const count = createCounter(() => location.query.hello);

          expect(location.query.hello).toEqual("world");
          signal[1]({ value: "/foo/bar?hello=foo" });

          waitFor(() => signal[0]().value === "/foo/bar?hello=foo").then(() => {
            expect(location.search).toEqual('hello=foo');
            expect(location.query.hello).toEqual("foo");
            expect(count()).toBe(1);
            resolve();
          });
        }));
    });
  });

  describe("have member `navigate` which should", () => {
    test(`update the location each time it is called`, () => {
      createRoot(() => {
        const signal = createSignal<RouteUpdate>({
          value: "/"
        });
        const { location, navigate } = createRouterState(signal);

        expect(location.pathname).toBe("/");
        navigate("/foo/1");
        expect(location.pathname).toBe("/foo/1");
        navigate("/foo/2");
        expect(location.pathname).toBe("/foo/2");
        navigate("/foo/3");
        expect(location.pathname).toBe("/foo/3");
      });
    });

    test(`do nothing if the new path is the same`, () =>
      createRoot(() => {
        const signal = createSignal<RouteUpdate>({
          value: "/foo/bar"
        });
        const { location, navigate } = createRouterState(signal);
        const count = createCounter(() => location.pathname);

        expect(location.pathname).toBe("/foo/bar");
        navigate("/foo/bar");
        expect(location.pathname).toBe("/foo/bar");
        expect(count()).toBe(0);
      }));

    test(`update the integrationSignal`, () =>
      createAsyncRoot(resolve => {
        const signal = createSignal<RouteUpdate>({
          value: "/"
        });
        const { navigate } = createRouterState(signal);
        expect(signal[0]().value).toBe("/");
        navigate("/foo/bar");

        waitFor(() => signal[0]().value === "/foo/bar").then(n => {
          expect(n).toBe(1);
          expect(signal[0]().mode).toBe("push");
          resolve();
        });
      }));

    test(`be able to be called many times before it updates the integrationSignal`, () =>
      createAsyncRoot(resolve => {
        const signal = createSignal<RouteUpdate>({
          value: "/"
        });
        const { navigate } = createRouterState(signal);

        expect(signal[0]()).toEqual({ value: "/" });
        navigate("/foo/1");
        navigate("/foo/2");
        navigate("/foo/3");
        navigate("/foo/4");
        navigate("/foo/5");

        waitFor(() => signal[0]().value === "/foo/5").then(n => {
          expect(n).toBe(1);
          expect(signal[0]().mode).toBe("push");
          resolve();
        });
      }));

    test(`throw if called more than 100 times during a reactive update`, () => {
      createRoot(() => {
        const signal = createSignal<RouteUpdate>({
          value: "/"
        });
        const { navigate } = createRouterState(signal);
        function pushAlot() {
          for (let i = 0; i < 101; i++) {
            navigate(`/foo/${i}`);
          }
        }
        expect(pushAlot).toThrow("Too many redirects");
      });
    });
  });

  describe("have member `isRouting` which should", () => {
    test.skip("be true when the push or replace causes transition", () => {
      throw new Error("Test not implemented");
    });
  });
});