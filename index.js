"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const geoip2_node_1 = require("@maxmind/geoip2-node");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
let reader;
function loadDatabase(dbPath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const dbBuffer = yield (0, promises_1.readFile)(dbPath);
            reader = geoip2_node_1.Reader.openBuffer(dbBuffer);
            console.log("GeoIP database loaded successfully");
        }
        catch (error) {
            console.error("Failed to load GeoIP database:", error);
            throw error;
        }
    });
}
// Utility function to extract response data
function extractLocationData(response) {
    var _a, _b, _c, _d, _e, _f, _g;
    return {
        city: (_b = (_a = response.city) === null || _a === void 0 ? void 0 : _a.names) === null || _b === void 0 ? void 0 : _b.en,
        country: (_d = (_c = response.country) === null || _c === void 0 ? void 0 : _c.names) === null || _d === void 0 ? void 0 : _d.en,
        latitude: (_e = response.location) === null || _e === void 0 ? void 0 : _e.latitude,
        longitude: (_f = response.location) === null || _f === void 0 ? void 0 : _f.longitude,
        accuracy_radius: (_g = response.location) === null || _g === void 0 ? void 0 : _g.accuracyRadius,
    };
}
// Plugin registration
function geoipPlugin(fastify, config) {
    return __awaiter(this, void 0, void 0, function* () {
        // Load the database on plugin registration
        yield loadDatabase(config.dbPath);
        // Reloader endpoint - for updating the database
        fastify.post("/reload-geoip", (request, reply) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield loadDatabase(config.dbPath);
                return {
                    status: "success",
                    message: "GeoIP database reloaded successfully",
                };
            }
            catch (error) {
                reply.status(500);
                return { status: "error", message: "Failed to reload GeoIP database" };
            }
        }));
        // Lookup endpoint
        fastify.get("/geoip", (request, reply) => __awaiter(this, void 0, void 0, function* () {
            const { ip } = request.query;
            if (!ip) {
                reply.status(400);
                return { error: "IP address is required" };
            }
            try {
                const response = reader.city(ip);
                return extractLocationData(response);
            }
            catch (error) {
                reply.status(500);
                return {
                    error: error instanceof Error ? error.message : "Unknown error occurred",
                };
            }
        }));
    });
}
exports.default = geoipPlugin;
// Example server setup
const fastify_1 = __importDefault(require("fastify"));
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        const fastify = (0, fastify_1.default)({
            logger: true,
        });
        yield fastify.register(geoipPlugin, {
            dbPath: path_1.default.join(process.cwd(), "GeoLite2-City.mmdb"),
        });
        try {
            yield fastify.listen({ port: 3000 });
            console.log("Server is running on port 3000");
        }
        catch (err) {
            fastify.log.error(err);
            process.exit(1);
        }
    });
}
startServer();
