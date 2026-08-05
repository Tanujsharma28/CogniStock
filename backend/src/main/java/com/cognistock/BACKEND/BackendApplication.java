package com.cognistock.backend;

import com.cognistock.backend.entity.User;
import com.cognistock.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner initAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		return args -> {
			if (userRepository.findByEmail("admin@cognistock.com").isEmpty()) {
				User admin = new User();
				admin.setEmail("admin@cognistock.com");
				admin.setPassword(passwordEncoder.encode("admin123"));
				admin.setRole("ADMIN");
				userRepository.save(admin);
				System.out.println(">>> Auto-created admin user: admin@cognistock.com / admin123");
			}
		};
	}
}

