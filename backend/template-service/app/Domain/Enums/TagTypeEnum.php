<?php

namespace App\Domain\Enums;

enum TagTypeEnum: int
{
    case TEXT = 1;
    case NUMBER = 2;
    case DATE = 3;
    case SELECT = 4;
    case EMAIL = 5;
    case TEXTAREA = 6;

    public function label(): string
    {
        return match($this) {
            self::TEXT     => 'Text',
            self::NUMBER   => 'Number',
            self::DATE     => 'Date',
            self::SELECT   => 'Select',
            self::EMAIL    => 'Email',
            self::TEXTAREA => 'Long Text',
        };
    }
}

