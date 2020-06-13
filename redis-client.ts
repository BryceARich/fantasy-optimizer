import * as redis from "redis"

export function getNewRedisClient(){
    let redisClient = redis.createClient()
    return redisClient;
}