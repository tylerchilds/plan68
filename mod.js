import { serveDir } from "@std/http/file-server";
import { typeByExtension } from "https://deno.land/std@0.186.0/media_types/type_by_extension.ts";

function getContentType(filename) {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return typeByExtension(ext);
}

Deno.serve(
  { hostname: "localhost", port: 1024 },
  async (req) => {
    const pathname = new URL(req.url).pathname;

    if (req.method === "HEAD") {
      try {
        const filePath = `.${pathname}`;
        const fileInfo = await Deno.stat(filePath);
        if (fileInfo.isFile) {
          return new Response(null, {
            status: 200,
            headers: {
              "content-length": fileInfo.size.toString(),
              "content-type": getContentType(pathname),
            },
          });
        }
      } catch {
        return new Response(null, { status: 404 });
      }
    }

    const response = await serveDir(req, {
      fsRoot: ".",
    });

    if (response.status === 404) {
      const TEMPLATE = await Deno.readTextFile("./index.html");

      return new Response(TEMPLATE, {
        status: 404,
        headers: {
          'content-type': 'text/html'
        }
      })

    }

    return response;
  }
);
