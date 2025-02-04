import { GenericRequest, GenericRequestHandler, GenericResponse, GenericRouter, buildRemultServer, RemultMiddlewareOptions, SpecificRoute, RemultServer } from './server/expressBridge';

export function remultMiddleware(options?:
    RemultMiddlewareOptions): RemultMiddleware {
    const m = new middleware();
    const server = buildRemultServer(m, options);
    return Object.assign((req, res, next) => m.handleRequest(req, res, next), {
        getRemult: (req) => server.getRemult(req),
        openApiDoc: (options: { title: string }) => server.openApiDoc(options),
        addArea: x => server.addArea(x),
        handle: (req, res) => m.handle(req, res)
    });

}
export interface RemultMiddleware extends GenericRequestHandler, RemultServer {
    handle(req: GenericRequest, gRes?: GenericResponse): Promise<MiddlewareResponse>
}

class middleware {
    map = new Map<string, Map<string, GenericRequestHandler>>();
    route(path: string): SpecificRoute {
        //consider using:
        //* https://raw.githubusercontent.com/cmorten/opine/main/src/utils/pathToRegex.ts
        //* https://github.com/pillarjs/path-to-regexp
        let r = path.toLowerCase();
        let m = new Map<string, GenericRequestHandler>();
        this.map.set(r, m);
        const route = {
            get: (h: GenericRequestHandler) => {
                m.set("get", h);
                return route;
            },
            put: (h: GenericRequestHandler) => {
                m.set("put", h);
                return route;
            },
            post: (h: GenericRequestHandler) => {
                m.set("post", h);
                return route;
            },
            delete: (h: GenericRequestHandler) => {
                m.set("delete", h);
                return route;
            }
        }
        return route;

    }
    async handle(req: GenericRequest, gRes?: GenericResponse): Promise<MiddlewareResponse | undefined> {

        return new Promise<MiddlewareResponse | undefined>(res => {
            const response = new class implements GenericResponse {
                statusCode: number;
                json(data: any) {
                    if (gRes !== undefined)
                        gRes.json(data);
                    res({ statusCode: this.statusCode, data });
                }
                status?(statusCode: number): GenericResponse {
                    if (gRes !== undefined)
                        gRes.status(statusCode);
                    this.statusCode = statusCode;
                    return this;
                }
                end() {
                    if (gRes !== undefined)
                        gRes.end();
                    res({
                        statusCode: this.statusCode
                    })
                }
            };
            this.handleRequest(req, response, () => res(undefined));
        })

    }
    handleRequest(req: GenericRequest, res: GenericResponse, next: VoidFunction) {
        let theUrl: string = req.url;
        if (theUrl.startsWith('/'))//next sends a partial url '/api/tasks' and not the full url
            theUrl = 'http://stam' + theUrl;
        const url = new URL(theUrl);
        const path = url.pathname;
        if (!req.query) {
            let query: { [key: string]: undefined | string | string[] } = {};
            url.searchParams.forEach((val, key) => {
                let current = query[key];
                if (!current) {
                    query[key] = val;
                    return;
                }
                if (Array.isArray(current)) {
                    current.push(val);
                    return;
                }
                query[key] = [current, val];
            });
            req.query = query;
        }
        let lowerPath = path.toLowerCase();
        let m = this.map.get(lowerPath);
        if (m) {
            let h = m.get(req.method.toLowerCase());
            if (h) {
                h(req, res, next);
                return;
            }
        }
        let idPosition = path.lastIndexOf('/');
        if (idPosition >= 0) {
            lowerPath = path.substring(0, idPosition) + '/:id';
            m = this.map.get(lowerPath);
            if (m) {
                let h = m.get(req.method.toLowerCase());
                if (h) {
                    if (!req.params)
                        req.params = {};
                    req.params.id = path.substring(idPosition + 1);
                    h(req, res, next);
                    return;
                }
            }
        }
        next();
    }
}
export interface MiddlewareResponse {
    data?: any;
    statusCode?: number;
}
export { GenericRequest, GenericRequestHandler, GenericResponse, GenericRouter, buildRemultServer, RemultMiddlewareOptions, SpecificRoute, RemultServer };