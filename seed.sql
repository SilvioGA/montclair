INSERT OR REPLACE INTO perfumes
(slug, name, house, smell, gender, world, moods, image, available, price_3, price_5, price_10, price_frasco, related)
VALUES
('le-beau-le-parfum', 'Le Beau Le Parfum', 'Jean Paul Gaultier', 'Dulce, coco y piña. De noche y para salir.', 'el', 'disenador', '["dulce","noche"]', '/products/le-beau.jpg', 1, 250, 400, 700, 4900, '["le-male-elixir","eros-edp"]'),
('212-men-edt', '212 Men EDT', 'Carolina Herrera', 'Fresco, limpio. Para el día y la oficina.', 'el', 'disenador', '["fresco","oficina"]', '/products/212-men.jpg', 1, 170, 260, 490, 3450, '["light-blue","eros-edp"]'),
('eros-edp', 'Eros Eau de Parfum', 'Versace', 'Menta, vainilla, presencia. El que más piden.', 'el', 'disenador', '["dulce","noche"]', '/products/eros.jpg', 1, 160, 240, 440, 3100, '["le-beau-le-parfum","most-wanted"]'),
('light-blue', 'Light Blue', 'Dolce & Gabbana', 'Cítrico, de día. Ligero, no aturde.', 'el', 'disenador', '["fresco","oficina"]', '/products/light-blue.jpg', 1, 150, 220, 420, 2950, '["212-men-edt","light-blue-dama"]'),
('light-blue-dama', 'Light Blue Dama', 'Dolce & Gabbana', 'Limón, manzana, fresco. Para el día.', 'ella', 'disenador', '["fresco"]', '/products/light-blue-dama.jpg', 1, 160, 240, 440, 3100, '["valentino-dama-bir","light-blue"]'),
('santal-33', 'Santal 33', 'Le Labo', 'Sándalo, cuero, seco. Nicho, se queda.', 'ambos', 'nicho', '["oficina","noche"]', '/products/santal-33.jpg', 1, 510, 830, 1640, 8900, '["most-wanted","le-male-elixir"]'),
('valentino-bir-intense', 'Born in Roma Intense', 'Valentino', 'Dulce, vainilla, intenso.', 'ella', 'disenador', '["dulce","noche"]', '/products/valentino-bir.jpg', 0, 250, 400, 700, 4900, '["valentino-dama-bir","light-blue-dama"]'),
('le-male-elixir', 'Le Male Elixir', 'Jean Paul Gaultier', 'Miel, lavanda, tabaco. Dulce y de noche.', 'el', 'disenador', '["dulce","noche"]', '/products/le-male-elixir.jpg', 1, 250, 400, 700, 4900, '["le-beau-le-parfum","most-wanted"]'),
('ysl-y-edp', 'Y Eau de Parfum', 'Yves Saint Laurent', 'Manzana, jengibre, fresco con presencia.', 'el', 'disenador', '["fresco","oficina"]', '/products/ysl-y.jpg', 0, 220, 380, 680, 4750, '["212-men-edt","light-blue"]'),
('valentino-dama-bir', 'Born in Roma Intense Dama', 'Valentino', 'Dulce, floral, vainilla. Para salir.', 'ella', 'disenador', '["dulce","noche"]', '/products/valentino-dama.jpg', 1, 280, 440, 850, 5950, '["light-blue-dama","santal-33"]'),
('most-wanted', 'The Most Wanted Parfum', 'Azzaro', 'Toffee, cardamomo, dulce. De noche.', 'el', 'disenador', '["dulce","noche"]', '/products/most-wanted.jpg', 1, 200, 320, 600, 4200, '["le-male-elixir","eros-edp"]');
