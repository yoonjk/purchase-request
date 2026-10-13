package com.demo.purchase.controller;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.demo.purchase.dao.MenuConfigMapper.MenuConfig;
import com.demo.purchase.service.MenuConfigService;

@RestController
public class MenuConfigController {
    private final MenuConfigService service;
    public MenuConfigController(MenuConfigService service) { this.service = service; }
    @GetMapping("/api/config/menus")
    public List<MenuConfig> menus() { return service.all(); }
    @GetMapping("/api/config/capabilities")
    public Map<String, Boolean> capabilities(Authentication authentication) {
        boolean admin = authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return Map.of("admin", admin);
    }
    @GetMapping("/api/admin/config/menus")
    public List<MenuConfig> adminMenus() { return service.allForAdmin(); }
    public record UpdateMenuRequest(String menuName, Boolean visible, Integer sortOrder) {}
    @PutMapping("/api/admin/config/menus/{code}")
    public Map<String, Object> update(@PathVariable String code, @RequestBody UpdateMenuRequest request) {
        try { service.update(code, request.menuName(), request.visible(), request.sortOrder()); }
        catch (IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage()); }
        return Map.of("menuCode", code, "updated", true);
    }
    @DeleteMapping("/api/admin/config/menus/{code}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String code) {
        try { service.delete(code); }
        catch (IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage()); }
    }
    @PostMapping("/api/admin/config/menus/{code}/restore")
    public Map<String, Object> restore(@PathVariable String code) {
        try { service.restore(code); }
        catch (IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage()); }
        return Map.of("menuCode", code, "restored", true);
    }
}
