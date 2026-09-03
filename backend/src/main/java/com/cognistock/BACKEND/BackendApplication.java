package com.cognistock.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.cognistock.backend.entity.User;
import com.cognistock.backend.repository.UserRepository;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner initAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		return args -> {
			seedUser(userRepository, passwordEncoder, "admin@cognistock.com", "Admin@123", "ADMIN");
			seedUser(userRepository, passwordEncoder, "manager@cognistock.com", "Manager@123", "MANAGER");
			seedUser(userRepository, passwordEncoder, "staff@cognistock.com", "Staff@123", "STAFF");
		};
	}

	private void seedUser(UserRepository userRepository, PasswordEncoder passwordEncoder,
	                       String email, String rawPassword, String role) {
		User user = userRepository.findByEmail(email).orElse(new User());
		user.setEmail(email);
		user.setPassword(passwordEncoder.encode(rawPassword));
		user.setRole(role);
		userRepository.save(user);
		System.out.println(">>> Seeded/Updated " + role + " user: " + email);
	}
}