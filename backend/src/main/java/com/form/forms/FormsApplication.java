package com.form.forms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import io.github.cdimascio.dotenv.Dotenv;

@SpringBootApplication
public class FormsApplication {

	public static void main(String[] args) {
		try {
			Dotenv dotenv = Dotenv.configure().load();
			dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));
		} catch (Exception e) {
			// .env might not exist in production or if env vars are set otherwise
			System.out.println(".env file not found or could not be loaded. Relying on System Environment Variables.");
		}
		SpringApplication.run(FormsApplication.class, args);
	}

}
