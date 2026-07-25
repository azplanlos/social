FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY target/backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Dspring.data.mongodb.uri=\"$MONGODB_URI\" -jar app.jar"]
