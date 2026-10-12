import { type NetworkMapping } from "./types";
import { readFileSync } from "node:fs";
import { createSecureContext } from "node:tls";

// checks
const httpPortValue = process.env.HTTP_PORT ?? "3005";
const httpsPortValue = process.env.HTTPS_PORT ?? "-1";
const httpsCertificatePublicPath = process.env.HTTPS_PUBLIC_CERT;
const httpsCertificatePrivatePath = process.env.HTTPS_PRIVATE_CERT;
const httpPort = Number(httpPortValue);
const httpsPort = Number(httpsPortValue);
if (
  !/^\d+$/.test(httpPortValue) ||
  !Number.isInteger(httpPort) ||
  httpPort < 1 ||
  httpPort > 65535
) {
  console.error("HTTP_PORT must be a whole number between 1 and 65535.");
  process.exit(1);
}

if (
  httpsPortValue !== "-1" &&
  (!/^\d+$/.test(httpsPortValue) ||
    !Number.isInteger(httpsPort) ||
    httpsPort < 1 ||
    httpsPort > 65535)
) {
  console.error(
    "HTTPS_PORT must be -1 (disabled) or a whole number between 1 and 65535.",
  );
  process.exit(1);
}

let httpsTls: { cert: Buffer; key: Buffer } | undefined;
if (httpsPort !== -1) {
  if (httpsPort === httpPort) {
    console.error("HTTP_PORT and HTTPS_PORT must be different.");
    process.exit(1);
  }
  if (
    !httpsCertificatePublicPath?.trim() ||
    !httpsCertificatePrivatePath?.trim()
  ) {
    console.error(
      "HTTPS_PUBLIC_CERT and HTTPS_PRIVATE_CERT are required when HTTPS is enabled.",
    );
    process.exit(1);
  }
  try {
    httpsTls = {
      cert: readFileSync(httpsCertificatePublicPath),
      key: readFileSync(httpsCertificatePrivatePath),
    };
    createSecureContext(httpsTls);
  } catch (error) {
    console.error(
      "Could not load HTTPS certificate and private key:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

// program
const apiRoutes = {
  "/": (request: Request, server: Bun.Server<undefined>) => {
    const ip = server.requestIP(request);
    const address = ip?.address.replace(/^::ffff:/i, "");
    return new Response(address ?? "IP address unavailable", {
      status: ip ? 200 : 500,
    });
  },
  "/info": async (request: Request, server: Bun.Server<undefined>) => {
    if (process.env.ENABLE_DETAILED_API?.toUpperCase() === "TRUE") {
      const ip = server.requestIP(request);
      const address = ip?.address.replace(/^::ffff:/i, "");
      if (!address) {
        return new Response("IP address unavailable", { status: 500 });
      }
      const [mapping] = await Bun.sql<NetworkMapping[]>`
      SELECT vlanid, netsubnet, netname
      FROM networkMappings
      WHERE ${address}::inet <<= netsubnet::inet
      LIMIT 1
    `;

      return Response.json({
        ip: address,
        details: mapping !== undefined,
        vlan: mapping?.vlanid ?? null,
        subnet: mapping?.netsubnet ?? null,
        netname: mapping?.netname ?? null,
      });
    }
    return new Response("Not Found");
  },
  //"/detail": (request: Request, server: Bun.Server<undefined>) => {
  //  const ip = server.requestIP(request);
  //  const address = ip?.address.replace(/^::ffff:/i, "");
  //  return Response.json({
  //    ipv4: address,
  //    ipv6: [""],
  //  });
  //},
  "/*": new Response("Not Found"),
};

Bun.serve({
  port: httpPort,
  routes: apiRoutes,
});

if (httpsTls) {
  Bun.serve({
    port: httpsPort,
    routes: apiRoutes,
    tls: httpsTls,
  });
}

console.log(
  `This server has started\n   HTTP URL: http://0.0.0.0:${httpPort}${httpsPortValue !== "-1" ? `\n   HTTPs URL: https://0.0.0.0:${httpsPortValue}` : ""}`,
);
