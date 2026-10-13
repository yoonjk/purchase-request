package com.demo.purchase.service;

import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.demo.purchase.dao.MenuConfigMapper;
import com.demo.purchase.dao.MenuConfigMapper.MenuConfig;

@Service
public class MenuConfigService {
    private static final Set<String> EDITABLE = Set.of("PORTFOLIO", "PROGRESS", "REPORTS", "TEST_AUTOMATION", "TEST_APPLICATIONS", "PURCHASE", "HR");
    private final MenuConfigMapper mapper;
    public MenuConfigService(MenuConfigMapper mapper) { this.mapper = mapper; }
    @Transactional(readOnly = true)
    public List<MenuConfig> all() { return mapper.findAll(); }
    @Transactional(readOnly = true)
    public List<MenuConfig> allForAdmin() { return mapper.findAllIncludingDeleted(); }
    private void checkCode(String code) {
        if (!EDITABLE.contains(code)) throw new IllegalArgumentException("Unknown or protected menu: " + code);
    }
    @Transactional
    public void update(String code, String name, Boolean visible, Integer sortOrder) {
        checkCode(code);
        if (name == null || name.isBlank() || name.strip().length() > 100) throw new IllegalArgumentException("Menu name must be 1-100 characters");
        if (visible == null || sortOrder == null || sortOrder < 0 || sortOrder > 9999) throw new IllegalArgumentException("Invalid visibility or sort order");
        if (mapper.updateMenu(code, name.strip(), visible, sortOrder) != 1) throw new IllegalArgumentException("Active menu not found: " + code);
    }
    @Transactional
    public void delete(String code) {
        checkCode(code);
        if (mapper.softDelete(code) != 1) throw new IllegalArgumentException("Active menu not found: " + code);
    }
    @Transactional
    public void restore(String code) {
        checkCode(code);
        if (mapper.restore(code) != 1) throw new IllegalArgumentException("Deleted menu not found: " + code);
    }
}
