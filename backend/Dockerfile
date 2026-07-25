FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY target/backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -jar app.jar --spring.data.mongodb.uri=$MONGODB_URI"]
