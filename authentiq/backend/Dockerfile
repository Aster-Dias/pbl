FROM eclipse-temurin:17-jdk-alpine as builder
WORKDIR /app
COPY . .
RUN apk add --no-cache maven && mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/authentiq-backend-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
