import { Reader } from "@maxmind/geoip2-node";
import { readFile } from "fs/promises";
import path from "path";
let reader;
async function loadDatabase(dbPath) {
    try {
        const dbBuffer = await readFile(dbPath);
        reader = Reader.openBuffer(dbBuffer);
        console.log("GeoIP database loaded successfully");
    }
    catch (error) {
        console.error("Failed to load GeoIP database:", error);
        throw error;
    }
}
// Utility function to extract response data
function extractLocationData(response) {
    return {
        city: response.city?.names?.en,
        country: response.country?.names?.en,
        countryIso: response.country?.isoCode,
        latitude: response.location?.latitude,
        longitude: response.location?.longitude,
        timezone: response.location?.timeZone,
    };
}
// Plugin registration
export default async function geoipPlugin(fastify, config) {
    // Load the database on plugin registration
    await loadDatabase(config.dbPath);
    // Reloader endpoint - for updating the database
    fastify.post("/reload-geoip", async (request, reply) => {
        try {
            await loadDatabase(config.dbPath);
            return {
                status: "success",
                message: "GeoIP database reloaded successfully",
            };
        }
        catch (error) {
            reply.status(500);
            return { status: "error", message: "Failed to reload GeoIP database" };
        }
    });
    // Lookup endpoint
    fastify.get("/geoip", async (request, reply) => {
        const { ip } = request.query;
        if (!ip) {
            reply.status(400);
            return { error: "IP address is required" };
        }
        try {
            const response = reader.city(ip);
            console.log(response);
            return extractLocationData(response);
        }
        catch (error) {
            reply.status(500);
            return {
                error: error instanceof Error ? error.message : "Unknown error occurred",
            };
        }
    });
    // Bulk Lookup endpoint
    fastify.post("/geoip/bulk", async (request, reply) => {
        const { ips } = request.body;
        // Limit the number of IPs to avoid overwhelming the server
        const MAX_IPS = 1000;
        if (ips.length > MAX_IPS) {
            reply.status(400);
            return { error: `Too many IPs provided. Maximum allowed is ${MAX_IPS}` };
        }
        if (!ips || !Array.isArray(ips)) {
            reply.status(400);
            return { error: "Array of IPs is required" };
        }
        const results = ips.reduce((acc, ip) => {
            try {
                const response = reader.city(ip);
                acc[ip] = { data: extractLocationData(response) };
            }
            catch (error) {
                acc[ip] = {
                    error: error instanceof Error ? error.message : "Unknown error occurred",
                };
            }
            return acc;
        }, {});
        return results;
    });
}
// Example server setup
import Fastify from "fastify";
const startServer = async () => {
    const fastify = Fastify({
        logger: true,
    });
    await fastify.register(import("@fastify/compress"), { global: true });
    await fastify.register(geoipPlugin, {
        dbPath: path.join(process.cwd(), "GeoLite2-City.mmdb"),
    });
    try {
        await fastify.listen({ port: 3500, host: "0.0.0.0" });
        console.log("Server is running on port 3500");
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
startServer();
