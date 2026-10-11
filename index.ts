Bun.serve({
  port: 3005,
  routes: {
    "/": (request, server) => {
      const ip = server.requestIP(request);
      const address = ip?.address.replace(/^::ffff:/i, "");
      return new Response(address ?? "IP address unavailable", {
        status: ip ? 200 : 500,
      });
    },
    "/info": async (request, server) => {
      if (process.env.ENABLE_DETAILED_API === "TRUE") {
        const ip = server.requestIP(request);
        const address = ip?.address.replace(/^::ffff:/i, "");
        const [mapping] = await Bun.sql`
        SELECT vlanid, netsubnet, netname
        FROM networkMappings
        WHERE ${address}::inet <<= netsubnet::inet
        LIMIT 1
      `;

        return Response.json({
          ip: address,
          vlan: mapping.vlanid,
          subnet: mapping.netsubnet,
          netname: mapping.netname,
        });
      }
      return new Response("Not Found");
    },
    //"/detail": (request, server) => {
    //  const ip = server.requestIP(request);
    //  const address = ip?.address.replace(/^::ffff:/i, "");
    //  return Response.json({
    //    ipv4: address,
    //    ipv6: [""],
    //  });
    //},
    "/*": new Response("Not Found"),
  },
});
